// api/team-members.js
import { Client, Environment } from "square";

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT?.toLowerCase() === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

export default async function handler(req, res) {
  try {
    //RAY--CHANGES
    const { result } = await client.teamApi.searchTeamMembers({});
    // Only include active barbers (filtering avoids inactive/deleted staff)
    const teamMembers = (result.teamMembers || [])
      .filter(m => m.status === "ACTIVE")
      .map(m => ({
        id: m.id,
        firstName: m.givenName,
        lastName: m.familyName,
        displayName: `${m.givenName || ""} ${m.familyName || ""}`.trim(),
        email: m.emailAddress,
        phone: m.phoneNumber,
      }));

    return res.status(200).json({ teamMembers });
  } catch (error) {
    console.error("Team Members API error:", error?.errors || error?.response || error);
    return res.status(500).json({ error: "Failed to load team members" });
  }
}
