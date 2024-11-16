
const fs = require("fs")

const http = require("http")
const cors = require("cors")
const sharp = require("sharp")
const express = require("express")

const app = express()
const server = http.createServer(app)

const router = {
    media: express.Router(),
    sermon: express.Router()
}

const storage = {
    media: (function(){
        results = {}
        fs.readdirSync(__dirname + "/storage/media").forEach((pathname) => {
            if (fs.statSync(__dirname + "/storage/media/" + pathname).isDirectory()) {
                fs.readdirSync(__dirname + "/storage/media/" + pathname).forEach((filename) => {
                    results[btoa(filename).slice(0, 10)] = { name: filename, path: __dirname + "/storage/media/" + pathname + "/" + filename, type: pathname }
                })
            } else results[btoa(pathname).slice(0, 10)] = { name: pathname, path: __dirname + "/storage/media/" + pathname }
        })
        return results
    })(),
    sermons: JSON.parse(fs.readFileSync(__dirname + "/storage/sermons.json"))
}

app.use(cors())
app.use(express.json())

app.use("/media", router.media)
app.use("/sermon", router.sermon)

router.media.get("/:id", async (request, response) => {
    if (request.headers["sec-fetch-dest"] === "image") {
        if (request.query.size) {
            if (storage.media[request.params.id]) {
                sharp(storage.media[request.params.id].path).resize(parseInt(request.query.size.split("x")[0]), parseInt(request.query.size.split("x")[1])).pipe(response)
            } else sharp(__dirname + "/storage/blank.png").resize(parseInt(request.query.size.split("x")[0]), parseInt(request.query.size.split("x")[1])).pipe(response)
        } else if (storage.media[request.params.id]) response.sendFile(storage.media[request.params.id].path)
    }
})
router.sermon.get("/:id", (request, response) => {
    sermons = Object.fromEntries([
        Object.entries(storage.sermons.series).map(
            (serie) => Object.entries(serie[1][1]).map(
                (sermon) => [
                    sermon[0], 
                    { 
                        id: sermon[0],
                        name: sermon[1].name,
                        date: sermon[1].date,
                        speaker: sermon[1].speaker,
                        content: sermon[1].content,
                        series: serie[0]
                    }
                ]
            )
        ).flat(),
        Object.entries(storage.sermons.standalone).map(
            (sermon) => [
                sermon[0],
                {
                    id: sermon[0],
                    name: sermon[1].name,
                    date: sermon[1].date,
                    speaker: sermon[1].speaker,
                    content: sermon[1].content
                }
            ]
        )
    ].flat())
    response.json(sermons[request.params.id])
})

app.use("/", (request, response) => {
    if (request.method === "GET") {
        if (request.headers["authorization"]) {
            response.json({
                series: Object.entries(storage.sermons.series).map((serie) => ({
                    id: serie[0], details: serie[1][0], sermons: Object.entries(serie[1][1]).map((sermon) => ({
                        id: sermon[0], name: sermon[1].name, speaker: sermon[1].speaker, date: sermon[1].date
                    }))
                })),
                standalone: Object.entries(storage.sermons.standalone).map((standalone) => ({
                    id: standalone[0], name: standalone[1].name, speaker: standalone[1].speaker, date: standalone[1].date
                }))
            })
        } else response.sendFile(__dirname + "/index.html")
    }
})

server.listen(5000, () => {
    console.log(storage)
})