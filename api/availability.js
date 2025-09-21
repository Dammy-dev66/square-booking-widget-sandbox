// api/availability.js
import { Client, Environment } from "square";

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT?.toLowerCase() === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

//RAy--changes
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const now = new Date();
const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { serviceVariationId, duration, startAt, endAt } = req.body || {};

    if (!serviceVariationId) {
      return res
        .status(400)
        .json({ error: "Missing required field: serviceVariationId" });
    }

    if (!process.env.SQUARE_LOCATION_ID) {
      console.error("Missing SQUARE_LOCATION_ID");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    // Build request body for Availability API
    //RAY-Changes
    const body = {
      query: {
        filter: {
          segmentFilters: [
            {
              serviceVariationId:serviceVariationId,
              durationMinutes:duration
            }
          ],
          locationId: process.env.SQUARE_LOCATION_ID,
          startAtRange: {
            startAt: now.toISOString(),
            endAt: weekAhead.toISOString()
          }
        },
      },
    };
    //Cross check start at and end at ranges
    ///RAY-Chanages
    if (startAt || endAt) {
      body.query.filter.startAtRange.startAt = startAt;
      body.query.filter.startAtRange.endAt = endAt;
    }
    ///RAY-Changes
    const resp = await client.bookingsApi.searchAvailability(body);

    if (resp?.errors) {
      console.error("Square API returned errors:", resp.errors);
      return res.status(500).json({ error: "Square API error", details: resp.errors });
    }

    const availability = resp?.result?.availabilities || [];
    console.log(availability)
    return res.status(200).json({ availability });
  } catch (error) {
    console.error("Availability API error:", error?.errors || error?.response || error);
    return res.status(500).json({ error: "Failed to load availability" });
  }
}
