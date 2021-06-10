import { createElasticClient } from "@keixdata/common";

const client = createElasticClient();

async function run() {
  client.index({
    index: "giftCardDanilo",
    id: "abc",
    body: {
      id: "abc",
      title: "Amazon",
      amount: [],
    },
  });

  const result = await client.get({
    index: "giftCardDanilo",
    id: "abc",
  });

  //result.body._source => { id: 'abc', _source: { id: 'abc', title: 'Amazon', amount: [] } }

  client.update({
    index: "giftCardDanilo",
    id: "abc",
    body: {
      doc: {
        title: "New Title",
      },
    },
  });

  const resultSearch = await client.search({
    index: "giftCardDanilo",
  });
}

run();
