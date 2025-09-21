// api/services.js
import { Client, Environment } from "square";

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT?.toLowerCase() === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

BigInt.prototype.toJSON = function () {
  return this.toString(); 
};

export default async function handler(req, res) {
  try {
    const { result } = await client.catalogApi.listCatalog(undefined, "ITEM");
    const services = (result.objects || []).map(obj => {
      //RAY-changes
      const { id, itemData } = obj;
      return {
        id,
        name: itemData?.name,
        variations: (itemData?.variations || []).map(v => ({
          id: v.id,
          name: v.itemVariationData?.name,
          price: v.itemVariationData?.priceMoney?.amount,
          currency: v.itemVariationData?.priceMoney?.currency,
          duration: v.itemVariationData?.serviceDuration,
        })),
      };
    });
    return res.status(200).json({ services });
  } catch (error) {
    console.error("Services API error:", error?.errors || error?.response || error);
    return res.status(500).json({ error: "Failed to load services" });
  }
}
