const { createRemoteFileNode } = require('gatsby-source-filesystem');

exports.normalize = async ({
  createNode,
  touchNode,
  store,
  cache,
  media: originalMedia,
  createNodeId,
}) => {
  let fileNodeID;
  const media = { ...originalMedia };

  if (media.internal && media.internal.type === 'CardMedia') {
    const remoteDataCacheKey = `card-media-${media.id}`;
    const cacheRemoteData = await cache.get(remoteDataCacheKey);

    if (cacheRemoteData) {
      fileNodeID = cacheRemoteData.fileNodeID;
      touchNode({ nodeId: cacheRemoteData.fileNodeID });
    }

    if (!fileNodeID) {
      try {
        const fileExt = media.url.split('.').pop();
        const fileNode = await createRemoteFileNode({
          url: media.url,
          cache,
          store,
          createNode,
          createNodeId,
          ext: `.${fileExt}`,
          name: media.name,
        });
        if (fileNode) {
          fileNodeID = fileNode.id;
          await cache.set(remoteDataCacheKey, { fileNodeID });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`ERROR while creating remote file : ${error}`);
      }
    }
    if (fileNodeID) {
      media.localFile___NODE = fileNodeID;
    }
  }
  return media;
};
