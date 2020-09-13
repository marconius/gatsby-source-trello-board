const { strictEqual, deepStrictEqual } = require('assert');
const nock = require('nock');
const slugify = require('slugify');

const { getTrelloCards } = require('../src/fetch');

const trelloBoardCardsFixture = require('./trello_board_fixture.json');

const { cards, checklists, lists } = trelloBoardCardsFixture;

const fakeConfig = { key: 'key', token: 'token', board_id: '1234556' };

function mockTrelloResponse() {
  nock('https://api.trello.com')
    .get(`/1/boards/${fakeConfig.board_id}`)
    .query((actualQuery) => (
      actualQuery.fields === 'desc,id,name,url'
      && actualQuery.cards === 'visible'
      && actualQuery.card_fields === 'id,idChecklists,idList,name,desc,due,url'
      && actualQuery.card_attachments === 'true'
      && actualQuery.card_attachments_fields === 'id,url,name,pos'
      && actualQuery.checklists === 'all'
      && actualQuery.checklist_fields === 'all'
      && actualQuery.lists === 'open'
      && actualQuery.list_fields === 'id,name,pos'
      && actualQuery.key === fakeConfig.key
      && actualQuery.token === fakeConfig.token
    ))
    .reply(200, trelloBoardCardsFixture);
}

describe('Data fetched from Trello', () => {
  beforeEach(() => {
    mockTrelloResponse();
  });

  it('includes all the cards from the board', async () => {
    const results = await getTrelloCards(fakeConfig);

    strictEqual(results.length, cards.length);
  });

  describe('Each Card', () => {
    const slugifyName = (name) => slugify(name, {
      replacement: '_',
      lower: true,
    });

    it('includes the card properties', async () => {
      const results = await getTrelloCards(fakeConfig);

      results.forEach((result, index) => {
        const card = cards[index];

        strictEqual(result.content, card.desc);
        strictEqual(result.due, card.due);
        strictEqual(result.id, card.id);
        strictEqual(result.index, index);
        strictEqual(result.name, card.name);
        strictEqual(result.slug, slugifyName(card.name));
        strictEqual(result.url, card.url);
      });
    });

    it('includes each card`s list properties', async () => {
      const results = await getTrelloCards(fakeConfig);

      results.forEach((result, index) => {
        const card = cards[index];

        strictEqual(result.list_id, card.idList);
        const listIndex = lists.findIndex((l) => l.id === card.idList);
        const list = lists[listIndex];
        strictEqual(result.list_index, listIndex);
        strictEqual(result.list_name, list.name);
        strictEqual(result.list_slug, slugifyName(list.name));
      });
    });

    it('includes checklists for each card', async () => {
      const results = await getTrelloCards(fakeConfig);

      results.forEach((result, index) => {
        const cardChecklistIds = cards[index].idChecklists;
        const cardChecklists = cardChecklistIds.map((id) => checklists.find((c) => id === c.id));

        strictEqual(result.checklists.length, cardChecklists.length);
        result.checklists.forEach((resChecklist) => {
          const checklist = cardChecklists.find((c) => resChecklist.id === c.id);
          strictEqual(resChecklist.id, checklist.id);
          strictEqual(resChecklist.idCard, checklist.idCard);
          deepStrictEqual(resChecklist.checkItems, checklist.checkItems);
        });
      });
    });
    it('parses attachments for consumption as files', () => {});
  });
});
