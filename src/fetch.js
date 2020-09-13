const axios = require('axios');
const slugify = require('slugify');

const trelloApiUrl = 'https://api.trello.com/1';

// Does what lodash keyBy does, but we assume that `id` key exists, and we
// include index for backwards compatibility.
const keyById = (objectArray) => (objectArray).reduce((result, item, index) => (
  { ...result, [item.id]: { ...item, index } }), {});

const slugifyName = (name) => slugify(name, {
  replacement: '_',
  lower: true,
});

exports.getTrelloCards = async ({
  key,
  token,
  board_id: boardId,
}) => {
  const results = [];

  try {
    const { data: boardData } = await axios.get(`${trelloApiUrl}/boards/${boardId}`, {
      params: {
        fields: 'desc,id,name,url',
        cards: 'visible',
        card_fields: 'id,idChecklists,idList,name,desc,due,url',
        card_attachments: 'true',
        card_attachments_fields: 'id,url,name,pos',
        checklists: 'all',
        checklist_fields: 'all',
        lists: 'open',
        list_fields: 'id,name,pos',
        key,
        token,
      },
    });

    const { cards, checklists, lists } = boardData;
    const checklistsById = keyById(checklists);
    const listsById = keyById(lists);

    cards.forEach((card, index) => {
      const medias = [];

      if (card.attachments.length) {
        card.attachments.forEach((a) => {
          medias.push({
            id: a.id,
            name: a.name,
            url: a.url,
            pos: a.pos,
            slug: slugifyName(a.name.split('.').shift()),
          });
        });
      }

      const cardList = listsById[card.idList];

      results.push({
        list_index: cardList.index,
        list_id: card.idList,
        list_slug: slugifyName(cardList.name),
        list_name: cardList.name,
        index,
        id: card.id,
        slug: slugifyName(card.name),
        name: card.name,
        content: card.desc,
        medias: medias || null,
        due: card.due,
        url: card.url,
        checklists: card.idChecklists.map((id) => checklistsById[id]),
      });
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`ERROR while fetching cards : ${error}`);
  }
  return results;
};
