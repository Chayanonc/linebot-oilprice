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

type Data = {
  name: string;
};

export const config = {
  api: {
    bodyParser: true,
  },
};

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const client = new messagingApi.MessagingApiClient(clientConfig);

const textEventHandler = async (event: webhook.Event | any) => {
  return new Promise(async (resolve, reject) => {
    // Process all variables here.
    if (event.type !== "message" || !event.message || event.message) {
      return;
    }

    console.log({ event });

    // Process all message related variables here.
    // Create a new message.
    // Reply to the user.
    const res = await client.replyMessage({
      replyToken: event.replyToken as string,
      messages: [
        {
          type: "text",
          text: event.message.text,
        },
      ],
    });
    resolve(res);
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(req.method);
  const response = await fetch(
    "https://oil-price.bangchak.co.th/ApiOilPrice2/en"
  );
  const data = await response.json();

  const callbackRequest: webhook.CallbackRequest = req.body;
  const events = callbackRequest.events!;
  console.log(data);
  let messageOil = "";
  const resOil = JSON.parse(data[0].OilList).map((item: any, index: number) => {
    messageOil += ` ${item.OilName} : ${item.PriceToday} \n`;
    return item;
  });

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

  // return res.status(200).json({
  //   messageOil,
  //   data,
  //   resOil,
  // });

  return res.status(200).json({
    status: "success",
    results,
  });
}
