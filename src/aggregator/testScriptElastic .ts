import { Client } from "@elastic/elasticsearch";

const client = new Client({ node: "https://dev.elastic.keix.com" });

async function run() {
  await client.index({
    index: "giftcardaniele",
    id: "abc",
    refresh: true,
    body: {
      id: "abc",
      title: "Amazon",
      amount: [],
    },
  });
  let res = await client.get({
    index: "giftcardaniele",
    id: "abc",
  });
  console.log(res);
  await client.delete({
    index: "giftcardaniele",
    id: "abc",
  });
  try {
    let res2 = await client.get({
      index: "giftcardaniele",
      id: "abc",
    });
    console.log(res2);
  } catch (err) {
    console.log(err);
  }
}

run();
