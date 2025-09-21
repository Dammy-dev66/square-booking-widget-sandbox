class BookingWidget {
    constructor() {
        this.selectedService = null;
        this.selectedBarber = null;
        this.selectedTime = null;
        this.services = [];
        this.barbers = [];
        this.availability = [];
        this.currentStep = 1;
        this.init();
    }

    async init() {
        try {
            await this.loadServices();
            this.renderServices();
            this.updateProgress();
        } catch (error) {
            console.error("Init error:", error);
            this.showError();
        }
    }

    updateProgress() {
        const progressFill = document.getElementById("progress-fill");
        const width = (this.currentStep / 3) * 100;
        progressFill.style.width = width + "%";

        for (let i = 1; i <= 3; i++) {
            const step = document.getElementById(`progress-step-${i}`);
            if (i <= this.currentStep) {
                step.classList.add("active");
            } else {
                step.classList.remove("active");
            }
        }
    }

    // --- 🔒 Safe Fetch Wrapper ---
    async safeFetch(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const text = await res.text();
                console.error(`Fetch failed [${url}]`, res.status, text.slice(0, 200));
                throw new Error(`API failed: ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            console.error(`Fetch error [${url}]`, err);
            throw err;
        }
    }

    async loadServices() {
        try {
            const data = await this.safeFetch("/api/services");
            this.services = data.services || [];
        } catch (error) {
            console.error("Failed to load services:", error);
            this.services = [];
        }
    }

    async loadBarbers() {
        try {
            const data = await this.safeFetch("/api/team-members");
            this.barbers = data.teamMembers || [];
        } catch (error) {
            console.error("Failed to load barbers:", error);
            this.barbers = [];
        }
    }

    async loadAvailability(serviceVariationId = null,duration=null) {
        try {
            const data = await this.safeFetch("/api/availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceVariationId: serviceVariationId || this.selectedService?.variationId,
                    duration:duration || this.selectedService?.duration
                }),
            });
            this.availability = data.availability || [];
        } catch (error) {
            console.error("Failed to load availability:", error);
            this.availability = [];
        }
    }

    renderServices() {
        const grid = document.getElementById("services-grid");
        grid.innerHTML = "";

        const servicesToRender =
            this.services && this.services.length > 0
                ? this.processApiServices()
                : this.getDemoServices();

        servicesToRender.forEach((service) => {
            const card = document.createElement("div");
            card.className = "service-card";
            card.innerHTML = `
                <div class="service-icon">${service.icon}</div>
                <h3>${service.name}</h3>
                <div class="service-price">$${service.basePrice}</div>
                <div class="service-duration">${service.duration} minutes</div>
                <div class="service-description">${service.description}</div>
            `;
            card.addEventListener("click", () => this.selectService(service, card));
            grid.appendChild(card);
        });
    }

    processApiServices() {
        const icons = ["✂️", "👦", "🧔", "💫", "🪒", "⭐"];
        const descriptions = [
            "Precision cutting with traditional techniques",
            "Gentle styling for young gentlemen",
            "Expert beard shaping and maintenance",
            "Complete grooming experience",
            "Classic hot towel shave",
            "Premium styling consultation",
        ];

        return this.services.map((service, index) => {
            const v = service.variations?.[0];
            const price = v?.price ? v.price / 100 : 25;
            const duration =
                v?.duration && !isNaN(v.duration) ? Math.round(v.duration / 60000) : 30;

            return {
                id: service.id,
                variationId: v?.id,
                name: service.name || "Premium Service",
                basePrice: price,
                duration,
                icon: icons[index % icons.length],
                description: descriptions[index % descriptions.length],
            };
        });
    }

    getDemoServices() {
        return [
            {
                id: "1",
                variationId: "1",
                name: "Gentleman's Cut",
                basePrice: 45,
                duration: 45,
                icon: "✂️",
                description: "Precision cutting with traditional techniques",
            },
            {
                id: "2",
                variationId: "2",
                name: "Young Gentleman",
                basePrice: 30,
                duration: 30,
                icon: "👦",
                description: "Professional styling for ages 12 and under",
            },
            {
                id: "3",
                variationId: "3",
                name: "Beard Sculpting",
                basePrice: 25,
                duration: 30,
                icon: "🧔",
                description: "Expert beard shaping and maintenance",
            },
            {
                id: "4",
                variationId: "4",
                name: "The Full Service",
                basePrice: 65,
                duration: 60,
                icon: "💫",
                description: "Complete grooming experience",
            },
        ];
    }

    async selectService(service, cardElement) {
        document
            .querySelectorAll(".service-card")
            .forEach((card) => card.classList.remove("selected"));
        cardElement.classList.add("selected");

        this.selectedService = service;
        this.showLoading();

        setTimeout(async () => {
            try {
                await this.loadBarbers();
                await this.loadAvailability(service.variationId,service.duration);
                this.currentStep = 2;
                this.updateProgress();
                this.showStep("step-barbers");
                this.renderServiceInfo();
                this.renderBarbersWithAvailability();
            } catch (error) {
                this.showError();
            }
        }, 800);
    }

    renderServiceInfo() {
        const infoDiv = document.getElementById("selected-service-info");
        infoDiv.innerHTML = `
            <h4>Selected Service</h4>
            <p><strong>${this.selectedService.name}</strong> - ${this.selectedService.basePrice} <span style="color: var(--text-muted);">(${this.selectedService.duration} min)</span></p>
            <p style="margin-top: 0.5rem; color: var(--text-secondary);">${this.selectedService.description}</p>
        `;
    }

    renderBarbersWithAvailability() {
        const grid = document.getElementById("barbers-grid");
        grid.innerHTML = "";

        if (this.barbers && this.barbers.length > 0) {
            this.barbers.forEach((barber) => {
                const barberAvailability = this.getBarberAvailability(barber.id);
                const card = this.createBarberCard(barber, barberAvailability);
                grid.appendChild(card);
            });
        } else {
            this.renderDemoBarbers();
        }
    }
    //RAY--changes
    getBarberAvailability(barberId) {
        return this.availability
            .filter((slot) =>
                slot.appointmentSegments?.some(
                    (segment) => segment.teamMemberId === barberId
                )
            )
            .slice(0, 3)
            .map((slot) => {
                const date = new Date(slot.startAt);
                const isToday = date.toDateString() === new Date().toDateString();
                const isTomorrow =
                    date.toDateString() ===
                    new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

                let dayLabel = "";
                if (isToday) dayLabel = "Today";
                else if (isTomorrow) dayLabel = "Tomorrow";
                else
                    dayLabel = date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                    });

                const timeLabel = date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                });

                return {
                    datetime: slot.startAt,
                    display: `${dayLabel} ${timeLabel}`,
                };
            });
    }

    createBarberCard(barber, availability) {
        const card = document.createElement("div");
        card.className = "barber-card";

        const memberName =
            `${barber.firstName || barber.given_name || ""} ${
                barber.lastName || barber.family_name || ""
            }`.trim() || "Master Barber";

        const nextSlots =
            availability.length > 0
                ? availability
                : [{ display: "Call to schedule", datetime: null }];
        
        card.innerHTML = `
            <div class="barber-avatar">${memberName.charAt(0)}</div>
            <h3>${memberName}</h3>
            <div class="barber-price">${this.selectedService.basePrice}</div>
            <div class="available-times">
                <strong>Next Available:</strong>
                ${nextSlots
                    .map(
                        (slot) =>
                            `<div class="time-slot ${
                                !slot.datetime ? "unavailable" : ""
                            }">${slot.display}</div>`
                    )
                    .join("")}
            </div>
            ${
                nextSlots[0].datetime
                    ? `<button class="book-btn" onclick="bookingWidget.selectBarberAndTime('${barber.id}', '${memberName}', '${nextSlots[0].datetime}', '${nextSlots[0].display}')">Book ${nextSlots[0].display}</button>`
                    : '<button class="book-btn" onclick="bookingWidget.callToSchedule()">Call to Schedule</button>'
            }
        `;

        return card;
    }

    renderDemoBarbers() {
        const grid = document.getElementById("barbers-grid");

        const demoBarbers = [
            {
                id: "james",
                name: "James",
                price: this.selectedService.basePrice,
                availableSlots: [
                    "Today 2:00 PM",
                    "Today 4:30 PM",
                    "Tomorrow 10:00 AM",
                ],
                specialty: "Classic & Modern Cuts",
                rating: "★★★★★",
            },
            {
                id: "dave",
                name: "Dave",
                price: this.selectedService.basePrice,
                availableSlots: ["Today 3:30 PM", "Tomorrow 9:00 AM", "Tomorrow 2:00 PM"],
                specialty: "Precision Fades",
                rating: "★★★★★",
            },
            {
                id: "ray",
                name: "Ray",
                price: this.selectedService.basePrice,
                availableSlots: [
                    "Tomorrow 11:00 AM",
                    "Tomorrow 1:30 PM",
                    "Wednesday 10:00 AM",
                ],
                specialty: "Traditional Barbering",
                rating: "★★★★★",
            },
        ];

        demoBarbers.forEach((barber) => {
            const card = document.createElement("div");
            card.className = "barber-card";
            card.innerHTML = `
                <div class="barber-avatar">${barber.name.charAt(0)}</div>
                <h3>${barber.name}</h3>
                <div class="barber-price">${barber.price}</div>
                <div class="barber-rating">${barber.rating}</div>
                <div class="barber-specialty">${barber.specialty}</div>
                <div class="available-times">
                    <strong>Next Available:</strong>
                    ${barber.availableSlots
                        .map((slot) => `<div class="time-slot">${slot}</div>`)
                        .join("")}
                </div>
                <button class="book-btn" onclick="bookingWidget.selectBarberAndTime('${barber.id}', '${barber.name}', null, '${barber.availableSlots[0]}')">
                    Book ${barber.availableSlots[0]}
                </button>
            `;
            grid.appendChild(card);
        });
    }

    selectBarberAndTime(barberId, barberName, datetime, displayTime) {
        this.selectedBarber = {
            id: barberId,
            name: barberName,
            price: this.selectedService.basePrice,
        };
        this.selectedTime = displayTime;
        this.selectedDate = datetime ? new Date(datetime) : new Date();

        const dateStr = this.selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        this.showSuccessModal(displayTime, dateStr);
    }

    callToSchedule() {
        window.open("tel:+19255550123", "_self");
    }

    showSuccessModal(time, dateStr) {
        const modal = document.getElementById("success-modal");
        const summary = document.getElementById("booking-summary");

        summary.innerHTML = `
            <p><strong>Service:</strong> <span>${this.selectedService.name}</span></p>
            <p><strong>Barber:</strong> <span>${this.selectedBarber.name}</span></p>
            <p><strong>Date:</strong> <span>${dateStr}</span></p>
            <p><strong>Time:</strong> <span>${time}</span></p>
            <p><strong>Duration:</strong> <span>${this.selectedService.duration} minutes</span></p>
            <p class="total"><strong>Total:</strong> <span>${this.selectedBarber.price}</span></p>
        `;

        this.currentStep = 3;
        this.updateProgress();
        modal.classList.remove("hidden");
    }

    showStep(stepId) {
        document.querySelectorAll(".step").forEach((step) =>
            step.classList.add("hidden")
        );
        document.getElementById(stepId).classList.remove("hidden");
        this.hideLoading();
        this.hideError();
    }

    showLoading() {
        document.getElementById("loading").classList.remove("hidden");
    }

    hideLoading() {
        document.getElementById("loading").classList.add("hidden");
    }

    showError() {
        document.getElementById("error").classList.remove("hidden");
        this.hideLoading();
    }

    hideError() {
        document.getElementById("error").classList.add("hidden");
    }
}

// Navigation
function goBack() {
    bookingWidget.currentStep = 1;
    bookingWidget.updateProgress();
    bookingWidget.showStep("step-services");
}

async function goToCheckout() {
    document.getElementById("success-modal").classList.add("hidden");
    document.getElementById("loading").classList.remove("hidden");

    try {
        const data = await bookingWidget.safeFetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                serviceName: bookingWidget.selectedService.name,
                barberName: bookingWidget.selectedBarber.name,
                price: bookingWidget.selectedBarber.price,
            }),
        });

        if (data.url) {
            window.location.href = data.url;
        } else {
            document.getElementById("loading").classList.add("hidden");
            bookingWidget.showError();
        }
    } catch (error) {
        console.error("Checkout error:", error);
        document.getElementById("loading").classList.add("hidden");
        bookingWidget.showError();
    }
}

const bookingWidget = new BookingWidget();

document.addEventListener("DOMContentLoaded", function () {
    console.log("Silver Fox Booking Widget loaded");
});
