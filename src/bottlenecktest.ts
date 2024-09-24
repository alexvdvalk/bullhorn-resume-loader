import axios from "axios";

import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
    maxConcurrent: 5,
    minTime: 10
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const makeRequest = async () => {
    console.log("making request", new Date().getTime());
    await sleep(2000)
    throw new Error("test")
}

for (let i of Array(200)) {
    limiter.schedule(() => makeRequest())
}