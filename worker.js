const PRODUCT_MAP = {
  "li_Q91XHLltyscRla": "Totapuri Mangoes 1Kg",
  "li_Q91XHMPO9SbK7i": "Alphonso Mangoes 1Kg",
  // Replace with your product details
  // Add more mappings as needed
};

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const order = payload?.payload?.order?.entity;
    const payment = payload?.payload?.payment?.entity;

    if (!order || !payment) {
      return new Response("Invalid payload", { status: 400 });
    }

    // Extract and map line items
    let lineItems = [];
    try {
      lineItems = JSON.parse(order.notes.line_items);
    } catch (e) {
      console.error("Failed to parse line items", e);
    }

    let total = 0;

    // Table header
    let itemsTable = "```";
    itemsTable += "Product                  Qty   Amount\n";
    itemsTable += "--------------------------------------\n";

    lineItems.forEach((item) => {
      const name = PRODUCT_MAP[item.liId] || item.liId;
      const qty = item.qty;
      const amt = (item.amt / 100).toFixed(2);
      total += parseFloat(amt);

      // pad product name to 22 chars
      const paddedName = name.padEnd(22, " ");
      itemsTable += `${paddedName} ${qty.toString().padEnd(4, " ")} ₹${amt}\n`;
    });

    itemsTable += "--------------------------------------\n";
    itemsTable += `Total:                          ₹${total.toFixed(2)}\n`;
    itemsTable += "```";

    // Discord embed
    const embed = {
      title: "✅ New Order Paid",
      color: 0x2ecc71, // Green
      fields: [
        {
          name: "Order ID",
          value: order.id,
          inline: false,
        },
        {
          name: "Amount Paid",
          value: `₹${(order.amount_paid / 100).toFixed(2)}`,
          inline: true,
        },
        {
          name: "Payment Method",
          value: `${payment.method.toUpperCase()} ${
            payment.card?.network || ""
          } ${payment.card?.last4 || ""}`,
          inline: true,
        },
        {
          name: "Customer",
          value: `${order.customer_details?.shipping_address?.name}\n📞 ${order.customer_details?.contact}\n✉️ ${order.customer_details?.email}`,
          inline: false,
        },
        {
          name: "Shipping Address",
          value: `${order.customer_details?.shipping_address?.line1}\n${order.customer_details?.shipping_address?.line2}\n${order.customer_details?.shipping_address?.city}, ${order.customer_details?.shipping_address?.state} - ${order.customer_details?.shipping_address?.zipcode}\n${order.customer_details?.shipping_address?.country?.toUpperCase()}`,
          inline: false,
        },
        {
          name: "Items Ordered",
          value: itemsTable || "N/A",
          inline: false,
        },
      ],
      timestamp: new Date(order.created_at * 1000).toISOString(),
      footer: {
        text: "Razorpay Store",
      },
    };

    // Send to Discord
    const discordWebhook = env.DISCORD_WEBHOOK_URL;
    if (discordWebhook) {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

    return new Response("OK", { status: 200 });
  },
};
