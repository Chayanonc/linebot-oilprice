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

interface User {
  type: string;
  userId: string;
  isBordcast: boolean;
}

const usersMember: Record<string, User> = {};
const users: User[] = [];

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const client = new messagingApi.MessagingApiClient(clientConfig);
let isBordcastToday = true;

setInterval(async () => {
  const now = new Date();
  const hours = now.getHours();

  console.log({ hours });

  // if (isBordcastToday) {
  if (isBordcastToday && hours >= 8 && hours <= 10) {
    isBordcastToday = false;

    const response = await fetch(
      "https://oil-price.bangchak.co.th/ApiOilPrice2/en"
    );
    const data = await response.json();

    const contents: any[] = [];
    JSON.parse(data[0].OilList).map((item: any, index: number) => {
      const priceDif = item.PriceDifTomorrow;

      const content = {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${item.OilName}`,
            size: "sm",
          },
          {
            type: "separator",
            margin: "xs",
          },
          {
            type: "text",
            text: `ราคาวันนี้: ${item.PriceToday} \nปรับราคา: ${priceDif} \nราคาพรุ่งนี้: ${item.PriceTomorrow} `,
            size: "xs",
            wrap: true,
            margin: "sm",
            color:
              parseFloat(priceDif) == 0
                ? "#000000"
                : parseFloat(priceDif) > 0
                ? "#FF0000"
                : "#32CD32",
          },
        ],
        paddingTop: "none",
        margin: "lg",
      };
      contents.push(content);
    });

    users.forEach(async (item) => {
      await client
        .pushMessage({
          messages: [
            {
              type: "flex",
              altText: `ราคาน้ำมันวันที่ ${data[0].OilDateNow}`,
              contents: {
                type: "bubble",
                header: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: `ราคาน้ำมันวันนี้ ${data[0].OilDateNow}`,
                    },
                  ],
                  justifyContent: "center",
                  alignItems: "center",
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: contents,
                  margin: "none",
                  spacing: "none",
                  paddingAll: "none",
                  paddingBottom: "xl",
                  paddingStart: "lg",
                  paddingEnd: "lg",
                  paddingTop: "none",
                },
              },
            },
          ],
          to: item.userId,
        })
        .catch((err) => {
          console.log(err);
        });
    });
  } else if (hours == 0) {
    isBordcastToday = true;
  }
}, 30 * 60 * 1000);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const callbackRequest: webhook.CallbackRequest = req.body;
  const events: any = callbackRequest.events!;
  try {
    events?.map(async (event: any) => {
      const text = event?.message?.text;
      const userId = event?.source?.userId;
      console.log({ userId });

      if (text === "register") {
        const info = {
          type: event?.source?.type,
          userId,
          isBordcast: true,
        };
        usersMember[userId] = info;
        users.push(info);

        const results = await client.replyMessage({
          replyToken: events[0].replyToken,
          messages: [
            {
              type: "text",
              text: "ลงทะเบียนสำเร็จ",
            },
            {
              type: "text",
              text: "ท่านได้ลงทะเบียนแล้ว เราจะส่งข้อมูลให้ท่านภายใน 8.00 - 10.00 น.",
            },
          ],
        });
        return res.status(200).json({
          status: "success",
          results,
        });
      } else {
        console.log(usersMember[userId]);

        if (usersMember[userId]) {
          const results = await client.replyMessage({
            replyToken: events[0].replyToken,
            messages: [
              {
                type: "text",
                text: "ท่านได้ลงทะเบียนแล้ว bot จะส่งข้อมูลให้ท่านภายใน 8.00 - 10.00 น.",
              },
            ],
          });
          return res.status(200).json({
            status: "success",
            results,
          });
        } else {
          const results = await client.replyMessage({
            replyToken: events[0].replyToken,
            messages: [
              {
                type: "text",
                text: "กรุณาลงทะเบียน พิมคำว่า register",
                quickReply: {
                  items: [
                    {
                      type: "action",
                      action: {
                        type: "message",
                        label: "register",
                        text: "register",
                      },
                    },
                  ],
                },
              },
            ],
          });
          return res.status(200).json({
            status: "success",
            results,
          });
        }
      }
    });

    return res.status(200).json({});
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
