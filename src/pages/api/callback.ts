// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
  ClientConfig,
  MessageAPIResponseBase,
  messagingApi,
  middleware,
  MiddlewareConfig,
  webhook,
} from "@line/bot-sdk";

export const config = {
  api: {
    bodyParser: true,
  },
};

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const client = new messagingApi.MessagingApiClient(clientConfig);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const callbackRequest: webhook.CallbackRequest = req.body;
  const events: any = callbackRequest.events!;
  try {
    const response = await fetch(
      "https://oil-price.bangchak.co.th/ApiOilPrice2/en"
    );
    const data = await response.json();

    let messageOil = `ราคาวันที่ ${data[0].OilDateNow} \n ------------------- \n`;
    const resOil = JSON.parse(data[0].OilList).map(
      (item: any, index: number) => {
        messageOil += ` ${item.OilName} \n -------------- \n ราคาวันนี้: ${item.PriceToday} \n ปรับราคา: ${item.PriceDifTomorrow} \n ราคาพรุ่งนี้: ${item.PriceTomorrow} \n\n\n`;
        return item;
      }
    );

    // return res.status(200).json({
    //   messageOil,
    //   data,
    //   resOil,
    // });

    const results = await Promise.all(
      events?.map(async (event: any) => {
        try {
          // await textEventHandler(event);
          return await client.replyMessage({
            replyToken: event.replyToken as string,
            messages: [
              {
                type: "text",
                text: messageOil,
              },
            ],
          });
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(err);
          }

          // Return an error message.
          return res.status(500).json({
            status: "error",
          });
        }
      }) || []
    );

    return res.status(200).json({
      status: "success",
      results,
    });
  } catch (error) {
    const results = await client.replyMessage({
      replyToken: events[0].replyToken,
      messages: [
        {
          type: "text",
          text: JSON.stringify(error),
        },
      ],
    });
    return res.status(200).json({
      status: "success",
      results,
    });
  }
}
