import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import NodeCache from 'node-cache'
import {
    getAllPosts,
    getPostByLink,
    getOneForCard,
    getAllForNavAndAP,
    getIdOfAll,
    getAllForCategories,
    getPrivacyPolicy,
    getTermsAndConditions,
    getAbout,
    UploadNewBlog,
    DeleteABlog,
    getPostById,
    DeleteAFolderFromCloudinary,
    getPrivacyPolicyForAdmin,
    getTermsAndConditionsForAdmin,
    getAboutForAdmin,
    UploadNewOthers,
    getScripts,
    UploadNewScripts,
    ChangeCreds,
    getCreds,
    DestroyImages
}
    from './database.js'
import { generateSitemap } from './sitemap-generator.js'

dotenv.config()
const app = express()
app.use(express.json())

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 })
const cachePrefix = "cache:"

app.use(cors())

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 500, // Limit each IP to 400 requests per 10 minutes
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
})

app.use('/api', limiter)

const checkCache = (key) => (req, res, next) => {
    const cachedData = cache.get(key)
    if (cachedData) {
        return res.send(cachedData)
    }
    next()
}

const setCache = (key, data) => {
    cache.set(key, data)
}

function ResetCache() {
    cache.flushAll()
}

const SecretKey = "ALLAH"


app.get("/api/getAllForNavAndAP", checkCache(cachePrefix + "AllForNavAndAP"), async (req, res) => {
    try {
        const data = await getAllForNavAndAP()
        const cacheKey = cachePrefix + "AllForNavAndAP"
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.send(cachedData)
        }
        setCache(cacheKey, data)
        res.send(data)

    } catch (error) {
        console.error(error.stack)
        res.status(500).send('Something broke!')
    }
})
app.get("/api/getIdOfAll", checkCache(cachePrefix + "IdOfAll"), async (req, res) => {
    try {
        const data = await getIdOfAll()
        const cacheKey = cachePrefix + "IdOfAll"
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.send(cachedData)
        }
        setCache(cacheKey, data)
        res.send(data);

    } catch (error) {
        console.error(error.stack)
        res.status(500).send('Something broke!')
    }
})
app.get("/api/getAllForCategories", checkCache(cachePrefix + "AllForCategories"), async (req, res) => {
    try {
        const data = await getAllForCategories()
        const cacheKey = cachePrefix + "AllForCategories"
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.send(cachedData)
        }
        setCache(cacheKey, data)
        res.send(data)
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/GetOneByLink", async (req, res) => {
    const link = req.query.link
    const cacheKey = `${cachePrefix}GetOneByLink:${link}`
    try {
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            res.send(cachedData);
        }
        else{
            const data = await getPostByLink(link);
            setCache(cacheKey, data);
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/GetOneById", async (req, res) => {
    const id = req.query.id
    const cacheKey = `${cachePrefix}GetOneById:${id}`
    try {
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            res.send(cachedData)
        }
        else{
            const data = await getPostById(id)
            setCache(cacheKey, data)
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack)
        res.status(500).send('Something broke!')
    }
})
app.get("/api/getOneForCard", async (req, res) => {
    const id = req.query.id
    const cacheKey = `${cachePrefix}GetOneForCard:${id}`
    try {
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            res.send(cachedData)
        }
        else {
            const data = await getOneForCard(id);
            setCache(cacheKey, data);
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/getPrivacyPolicy", checkCache(cachePrefix + "PrivacyPolicy"), async (req, res) => {
    try {
        const data = await getPrivacyPolicy()
        const cacheKey = cachePrefix + "PrivacyPolicy"
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.send(cachedData)
        }
        else {
            setCache(cacheKey, data)
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/getOthersForAdmin", async (req, res) => {
    const name = req.query.name
    try {
        if (name === "pp") {
            const data = await getPrivacyPolicyForAdmin()
            res.send(data)
        }
        else if (name === "tc") {
            const data = await getTermsAndConditionsForAdmin()
            res.send(data)
        }
        else if (name === "ab") {
            const data = await getAboutForAdmin()
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack)
        res.status(500).send('Something broke!')
    }
})
app.post("/api/UploadOthers", async (req, res) => {
    const data = req.body
    try {
        if (data.Title === "PP" || data.Title === "TC" || data.Title === "A") {
            const response = await UploadNewOthers(data)
            if (response) {
                res.json({ msg: 'SUCCESSFUL' })
                ResetCache()
            }
            else {
                res.json({ msg: 'UNSUCCESSFUL' })
            }
        }
    } catch (error) {
        console.error(error.stack)
        res.json({ msg: 'UNSUCCESSFUL' })
    }
})
app.post("/api/UploadScripts", async (req, res) => {
    const data = req.body
    try {
        const response = await UploadNewScripts(data)
        if (response) {
            res.json({ msg: 'SUCCESSFUL' })
            ResetCache()
        }
        else {
            res.json({ msg: 'UNSUCCESSFUL' })
        }

    } catch (error) {
        console.error(error.stack)
        res.json({ msg: 'UNSUCCESSFUL' })
    }
})
app.post("/api/UploadNewCreds", async (req, res) => {
    const data = req.body
    try {
        const response = await ChangeCreds(data)
        if (response) {
            res.json({ msg: 'SUCCESSFUL' })
        }
        else {
            res.json({ msg: 'UNSUCCESSFUL' })
        }

    } catch (error) {
        console.error(error.stack)
        res.json({ msg: 'UNSUCCESSFUL' })
    }
})
app.get("/api/getTermsAndConditions", checkCache(cachePrefix + "TermsAndConditions"), async (req, res) => {
    try {
        const data = await getTermsAndConditions()
        const cacheKey = cachePrefix + "TermsAndConditions"
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.send(cachedData)
        }
        else {
            setCache(cacheKey, data)
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/getAbout", checkCache(cachePrefix + "About"), async (req, res) => {
    try {
        const data = await getAbout()
        const cacheKey = cachePrefix + "About"
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.send(cachedData)
        }
        else {
            setCache(cacheKey, data)
            res.send(data)
        }
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/getScripts", async (req, res) => {
    try {
        const data = await getScripts()
        res.send(data)
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/CheckAuth", async (req, res) => {
    const { Code } = req.query
    try {
        jwt.verify(Code, SecretKey)
        res.json({ msg: "Authentication Successful!" })
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Something broke!');
    }
})
app.get("/api/CheckCred", async (req, res) => {
    const { Username, Password } = req.query
    try {
        const obj = await getCreds()
        if (Username === obj.Username && Password === obj.Password) {
            const Token = jwt.sign({ Username }, SecretKey, { expiresIn: '10d' })
            const data = {
                msg: "Authentication Successful!",
                token: Token
            }
            res.send(data)
        }
        else {
            res.send({ msg: "invalid credentials" })
        }
    }
    catch (err) {
        console.error(err)
    }
})
let isProcessing = false
app.post("/api/UploadBlog", async (req, res) => {
    if (isProcessing) {
        return res.status(400).send('Already processing');
    }
    isProcessing = true
    const data = req.body
    try {
        const response1 = await UploadNewBlog(data)
        if (response1) {
            const response2 = generateSitemap()
            if (response2) {
                res.json({ msg: 'SUCCESSFUL' })
                ResetCache()
            }
            else {
                res.json({ msg: 'UNSUCCESSFUL' })
            }
        }
        else {
            res.status(400).json({ msg: 'UNSUCCESSFUL' })
        }
        isProcessing = false
    }
    catch (err) {
        console.error(err)
        isProcessing = false
        res.json({ msg: 'UNSUCCESSFUL' })
    }
})
app.delete("/api/DeleteFolder", async (req, res) => {
    const folderName = req.query.folderName
    try {
        const response1 = await DeleteAFolderFromCloudinary(folderName)
        if (response1) {
            res.json({ msg: 'SUCCESSFUL' })
        }
        else {
            res.status(400).json({ msg: 'UNSUCCESSFUL' })
        }
    }
    catch (err) {
        console.error(err)
        res.json({ msg: 'UNSUCCESSFUL' })
    }
})
app.delete("/api/DestroyImages", async (req, res) => {
    const { public_id } = req.body
    try {
        const response = await DestroyImages(public_id)
        res.status(200).json({ success: true, response })
    } catch (error) {
        res.status(500).json({ success: false, error })
    }
})
app.delete("/api/DeleteBlog", async (req, res) => {
    const id = req.query.id
    const ID = Number(id)
    try {
        const response1 = await DeleteABlog(ID)
        if (response1) {
            const response2 = await DeleteAFolderFromCloudinary(`BlogPics/blog${ID + 1}`)
            if (response2) {
                const response3 = generateSitemap()
                if (response3) {
                    res.json({ msg: 'SUCCESSFUL' })
                    ResetCache()
                }
                else {
                    res.json({ msg: 'UNSUCCESSFUL' })
                }
            }
            else {
                res.json({ msg: 'UNSUCCESSFUL' })
            }
        }
        else {
            res.json({ msg: 'UNSUCCESSFUL' })
        }
    }
    catch (err) {
        console.error(err)
        res.json({ msg: 'UNSUCCESSFUL' })
    }
})

const port = process.env.PORT || 7575

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})