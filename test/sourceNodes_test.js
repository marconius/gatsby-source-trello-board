const { strictEqual, deepStrictEqual } = require('assert');
const sinon = require('sinon');

const {
  toCardNode,
  toCheckListItemNode,
  toCheckListNode,
  sourceNodes,
} = require('../src/sourceNodes');
const fetch = require('../src/fetch');

describe('Graphql', () => {
  const checkItem1 = {
    id: '59ae06dc4c215c8cf94cd47a',
    idChecklist: '59ae06d39f754ff22ca604ee',
    name: 'Water Melon',
  };
  const checkItem2 = {
    id: '59ae06e0bce19711997f7354',
    idChecklist: '59ae06d39f754ff22ca604ee',
    name: 'Cantaloupe',
  };
  const checklist = {
    checkItems: [
      checkItem1,
      checkItem2,
    ],
    id: '59ae06d39f754ff22ca604ee',
    name: 'Fruits Grown in Quebec',
  };
  const mockCards = [
    {
      list_index: 2,
      list_id: 'list-123',
      list_slug: 'slugified-list-name',
      list_name: 'regular list name',
      index: 34,
      id: 'card-333',
      slug: 'slugified-card-name',
      name: 'Card Name',
      content: 'This is a card from a Trello Board',
      medias: null,
      due: '2020-04-29T01:55:00.000Z',
      url: 'https://trello.com/c/LMEy1myI/47-fruits',
      checklists: [checklist],
    },
  ];

  let createContentDigest;

  beforeEach(() => {
    createContentDigest = sinon.stub().returns({ hi: 'there' });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('creates nodes and sets the hierarchy', async () => {
    const logStub = sinon.spy(console, 'log');
    const createNode = sinon.stub();
    const createParentChildLink = sinon.stub();
    const sourceNodesParams = {
      actions: { createNode, createParentChildLink },
      store: {},
      cache: {},
      createContentDigest,
    };
    const board = {
      id: '28173234a87f10e7dd343234',
      name: 'Recipes',
      desc: 'A Cool Recipe Board',
      url: 'https://trello.com/b/AFakeIDhere/recipes',
    };
    sinon.stub(fetch, 'getTrelloCards').resolves({
      board,
      cardsWithAttachmentsAndChecklists: mockCards,
    });

    await sourceNodes(sourceNodesParams);

    strictEqual(logStub.callCount, 2, 'should not have an error message');
    const createNodeCalls = createNode.getCalls();
    // first creates a board node, then a card node for each card, then one for each cheklist of a
    // card, then one for each item of those checklists
    const allChecklists = mockCards.reduce((cls, card) => cls.concat(card.checklists), []);
    const allItems = allChecklists.reduce((clis, chklst) => clis.concat(chklst.checkItems), []);
    strictEqual(
      createNodeCalls.length,
      1 + mockCards.length + allChecklists.length + allItems.length,
    );
    const expectedCardNode = toCardNode(mockCards[0], createContentDigest);
    const expectedChecklistNode = toCheckListNode(checklist, createContentDigest);
    const expectedChecklistItemNode1 = toCheckListItemNode(
      checkItem1,
      createContentDigest,
    );
    const expectedChecklistItemNode2 = toCheckListItemNode(
      checkItem2,
      createContentDigest,
    );
    const expectedBoardNode = {
      ...board,
      internal: {
        type: 'TrelloBoard',
        contentDigest: createContentDigest(board),
        mediaType: 'text/markdown',
      },
    };
    deepStrictEqual(createNodeCalls[0].firstArg, expectedBoardNode);
    deepStrictEqual(createNodeCalls[1].firstArg, expectedCardNode);
    deepStrictEqual(createNodeCalls[2].firstArg, expectedChecklistNode);
    deepStrictEqual(createNodeCalls[3].firstArg, expectedChecklistItemNode1);
    deepStrictEqual(createNodeCalls[4].firstArg, expectedChecklistItemNode2);
    deepStrictEqual(
      createParentChildLink.getCalls()[0].firstArg,
      { parent: expectedBoardNode, child: expectedCardNode },
    );
    deepStrictEqual(
      createParentChildLink.getCalls()[1].firstArg,
      { parent: expectedCardNode, child: expectedChecklistNode },
    );
    deepStrictEqual(
      createParentChildLink.getCalls()[2].firstArg,
      { parent: expectedChecklistNode, child: expectedChecklistItemNode1 },
    );
    deepStrictEqual(
      createParentChildLink.getCalls()[3].firstArg,
      { parent: expectedChecklistNode, child: expectedChecklistItemNode2 },
    );
    strictEqual(createParentChildLink.getCalls().length, 4);
  });

  describe('trelloCard node properties', () => {
    it('includes properties', () => {
      const cardNode = toCardNode(mockCards[0], () => {});

      deepStrictEqual(cardNode.due, new Date(mockCards[0].due));
    });
    it('handles null date', () => {
      const cardNode = toCardNode({ ...mockCards[0], due: null }, () => {});

      strictEqual(cardNode.due, null);
    });
  });

  describe('checklist', () => {
    it('includes properties', () => {
      const checklistNode = toCheckListNode(checklist, createContentDigest);

      strictEqual(checklistNode.id, checklist.id);
      strictEqual(checklistNode.name, checklist.name);
    });

    it('is type TrelloChecklist', () => {
      const checklistNode = toCheckListNode(checklist, createContentDigest);

      strictEqual(checklistNode.internal.type, 'TrelloBoardChecklist');
    });

    it('uses fetched object as digest', () => {
      createContentDigest.returns('hash12323');

      const checklistNode = toCheckListNode(checklist, createContentDigest);

      deepStrictEqual(createContentDigest.lastCall.firstArg, checklist);
      strictEqual(checklistNode.internal.contentDigest, 'hash12323');
    });
  });

  describe('checklistItems', () => {
    it('includes properties', () => {
      const checklistItemNode = toCheckListItemNode(checkItem2, createContentDigest);

      strictEqual(checklistItemNode.id, checkItem2.id);
      strictEqual(checklistItemNode.name, checkItem2.name);
    });

    it('is type TrelloBoardChecklistItem', () => {
      const checklistItemNode = toCheckListItemNode(checkItem2, createContentDigest);

      strictEqual(checklistItemNode.internal.type, 'TrelloBoardChecklistItem');
    });

    it('uses fetched object as digest', () => {
      createContentDigest.returns('test123');
      const checklistItemNode = toCheckListItemNode(checkItem2, createContentDigest);

      deepStrictEqual(createContentDigest.lastCall.firstArg, checkItem2);
      strictEqual(checklistItemNode.internal.contentDigest, 'test123');
    });
  });
});
