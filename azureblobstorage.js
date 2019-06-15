
const {
    Aborter, BlobURL,
    BlockBlobURL, ContainerURL,
    ServiceURL,
    StorageURL,
    SharedKeyCredential,
    generateBlobSASQueryParameters,
    uploadStreamToBlockBlob,
    BlobSASPermissions,
    SASProtocol,
    AnonymousCredential,
} = require("@azure/storage-blob");


const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT;
const ACCOUNT_ACCESS_KEY = process.env.STORAGE_KEY;
const AS = {};    // Azure Storage
console.log(STORAGE_ACCOUNT_NAME);
/*
// const ONE_MEGABYTE = 1024 * 1024;
// const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;
// const ONE_MINUTE = 60 * 1000;
// By default, credential is always the last element of pipeline factories
// const factories = serviceURL.pipeline.factories;
//const sharedKeyCredential = factories[factories.length - 1];
// const containerName = getUniqueName("container");
//const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
//const blobName = getUniqueName("blob");
//const blobURL = BlockBlobURL.fromContainerURL(containerURL,blobName);
*/

AS.getServiceUrl = () => {
    const credentials = new SharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
    const pipeline = StorageURL.newPipeline(credentials);
    const serviceURL = new ServiceURL(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, pipeline);
    return serviceURL;
}

AS.createBlockBlobSASToken = (blobName, containerName, options) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 5); // Skip clock skew with server
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const credentials = new SharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
    const blobSAS = generateBlobSASQueryParameters(
        {
            blobName,
            containerName,
            expiryTime: tmr,
            permissions: BlobSASPermissions.parse("racwd").toString(),
            protocol: SASProtocol.HTTPSandHTTP,
            startTime: now,
        },
        credentials
    );
    //const sasURL = `${blobURL.url}?${blobSAS}`;
    return blobSAS
}


AS.createContainerSASToken = (containerName, options) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 5); // Skip clock skew with server
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const credentials = new SharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
    const containerSAS = generateBlobSASQueryParameters(
        {
            containerName,
            expiryTime: tmr,
            permissions: ContainerSASPermissions.parse("racwdl").toString(),
            protocol: SASProtocol.HTTPSandHTTP,
            startTime: now,
            version: "2016-05-31"
        },
        credentials
    );
    // const sasURL = `${containerURL.url}?${containerSAS}`;
    return containerSAS;
}

AS.createBlockBlobSASURL = (blobName, containerName) => {
    let blockBlobURL = getBlockBlobUrl(blobName, containerName);
    let blobSAS = createBlockBlobSASToken(blobName, containerName);
    const sasURL = `${blockBlobURL.url}?${blobSAS}`;
    return sasURL;
}

AS.createContainer = (containerName) => {
    const serviceURL = getServiceUrl();
    const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
    return containerURL.create(Aborter.none);
}

AS.getBlockBlobUrl = (blobName, containerName) => {
    const serviceURL = getServiceUrl();
    const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
    const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, blobName);
    return blockBlobURL;
}

AS.uploadToBlockBlobFromStream = (blobName, containerName, readableStream, fileSizeInBytes) => {
    const blockBlobURL = getBlockBlobUrl(blobName, containerName);
    return uploadStreamToBlockBlob(Aborter.none,
        readableStream,
        blockBlobURL,
        256 * 1024,
        2,
        {
            progress: function (ev) {
                console.log((ev.loadedBytes / fileSizeInBytes) * 100);
            }
        }
    )
}

// const uploadFileFromBuffer = (blobName, containerName,buffer, fileSizeInBytes) =>{


// }

AS.uploadBlockBlobWithSAS = (blobName, containerName, readableStream, fileSizeInBytes) => {
    const blockBlobSasUrl = createBlockBlobSASURL(blobName, containerName);
    let blockBlobURL = new BlockBlobURL(blockBlobSasUrl, StorageURL.newPipeline(new AnonymousCredential()))
    return uploadStreamToBlockBlob(Aborter.none,
        readableStream,
        blockBlobURL,
        4 * 1024 * 1024,
        2,
        {
            progress: function (ev) {
                console.log((ev.loadedBytes / fileSizeInBytes) * 100);
            }
        }
    )
}

AS.deleteBlockBlob = (blobName, containerName) => {
    const blockBlobURL = getBlockBlobUrl(blobName, containerName);
    return blockBlobURL.delete(Aborter.none)

}

AS.downloadBlob = async (blobName, containerName) => {
    const blockBlobURL = await getBlockBlobUrl(blobName, containerName);
    const downloadSteeam = blockBlobURL.download(aborter, 0);
    return downloadSteeam;
}

module.exports = AS;