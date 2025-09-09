import mysql from 'mysql2'
import dotenv from 'dotenv'
import cloudinary from 'cloudinary'

dotenv.config()

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
})


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 40,
    queueLimit: 0,
    multipleStatements: true,
}).promise();

export async function getAllPosts() {
    try {
        const [rows] = await pool.query(`
        SELECT DISTINCT
            P.id AS Blog_id,
            P.Title AS Blog_Title,
            P.Category,
            P.MetaTitle,
            P.MetaDescription,
            P.Permalink,
            P.Keywords,
            P.RelatedPosts,
            P.NumOfEntries,
            P.PublishingDate,
            S.OrderNumber AS Section_OrderNum,
            S.SectionType,
            S.AnchorLink,
            S.Content AS Section_Content,
            I.ImgOrderNum AS Image_OrderNum,
            I.SectionType AS Image_Type,
            I.ImgPath AS Image_Path,
            I.ImgAlt AS Image_Alt,
            B.OrderNum AS Table_OrderNum,
            B.Headers AS Table_Headers,
            B.Table_content,
            Q.id AS Faq_id,
            Q.Que AS Faq_Que,
            Q.Ans AS Faq_Ans
        FROM Posts P
        LEFT JOIN Sections S ON P.id = S.Post_id
        LEFT JOIN Images I ON P.id = I.Post_id
        LEFT JOIN BlogTables B ON P.id = B.Post_id
        LEFT JOIN Qna Q ON P.id = Q.Post_id
        ORDER BY P.id, S.OrderNumber;
    `)

        const posts = {};

        rows.forEach(row => {
            const {
                Blog_id,
                Blog_Title,
                Category,
                MetaTitle,
                MetaDescription,
                Permalink,
                Keywords,
                RelatedPosts,
                NumOfEntries,
                PublishingDate,
                Section_OrderNum,
                SectionType,
                AnchorLink,
                Section_Content,
                Image_OrderNum,
                Image_Type,
                Image_Path,
                Image_Alt,
                Table_OrderNum,
                Table_Headers,
                Table_content,
                Faq_id,
                Faq_Que,
                Faq_Ans,
            } = row

            if (!posts[Blog_id]) {
                posts[Blog_id] = {
                    id: Blog_id,
                    Title: Blog_Title,
                    Category,
                    FPic: null,
                    FPicAlt: null,
                    Sections: [],
                    faqs: [],
                    RelatedPosts: RelatedPosts ? RelatedPosts.split(',') : [],
                    NumOfEntries,
                    MetaTitle,
                    MetaDescription,
                    Permalink,
                    Keywords,
                    PublishingDate,
                };
            }

            if (Image_Type === "Featuring_Image" && Image_OrderNum !== null) {
                posts[Blog_id].FPic = Image_Path;
                posts[Blog_id].FPicAlt = Image_Alt;
            }

            if (SectionType && Section_OrderNum !== null) {
                const existingSection = posts[Blog_id].Sections.find(
                    section =>
                        section.Section_OrderNum === Number(Section_OrderNum) &&
                        section.Type === SectionType
                );

                if (!existingSection) {
                    posts[Blog_id].Sections.push({
                        Section_OrderNum: Number(Section_OrderNum),
                        Type: SectionType,
                        Content: Section_Content,
                        AnchorLink,
                    });
                }
            }

            if (Image_Type === "Img" && Image_OrderNum !== null) {
                const existingImage = posts[Blog_id].Sections.find(
                    section =>
                        section.Section_OrderNum === Number(Image_OrderNum) &&
                        section.Type === "Img" &&
                        section.ImgPath === Image_Path
                );

                if (!existingImage) {
                    posts[Blog_id].Sections.push({
                        Section_OrderNum: Number(Image_OrderNum),
                        Type: "Img",
                        ImgPath: Image_Path,
                        ImgAlt: Image_Alt,
                    });
                }
            }

            if (Table_OrderNum !== null) {
                const existingTable = posts[Blog_id].Sections.find(
                    section =>
                        section.Section_OrderNum === Number(Table_OrderNum) &&
                        section.Type === "Table"
                );

                if (!existingTable) {
                    posts[Blog_id].Sections.push({
                        Section_OrderNum: Number(Table_OrderNum),
                        Type: "Table",
                        Headers: Table_Headers,
                        Content: JSON.parse(Table_content),
                    });
                }

            }

            if (Faq_id !== null) {
                const existingFaq = posts[Blog_id].faqs.find(
                    faq =>
                        faq.id === Number(Faq_id)
                );
                if (!existingFaq) {
                    posts[Blog_id].faqs.push({
                        id: Number(Faq_id),
                        [`Qs${Faq_id}`]: Faq_Que,
                        [`Ans${Faq_id}`]: Faq_Ans,
                    });
                }
            }
        })

        const formattedData = Object.values(posts).map(post => {
            const sections = {};
            post.Sections.sort((a, b) => a.Section_OrderNum - b.Section_OrderNum).forEach((section, index) => {
                const keyPrefix =
                    section.Type === "para" ? "Para" :
                        section.Type === "head" ? "Head" :
                            section.Type === "Img" ? "Pic" :
                                section.Type === "Table" ? "table" :
                                    section.Type === "anchor" ? "AnchorWord" : null;

                if (keyPrefix) {
                    const key = `${keyPrefix}${section.Section_OrderNum}`;
                    if (section.Type === "anchor") {
                        sections[key] = section.Content;
                        sections[`AnchorLink${section.Section_OrderNum}`] = section.AnchorLink;
                    }
                    else if (section.Type === "Img") {
                        sections[key] = section.ImgPath
                        sections[`Alt${key}`] = section.ImgAlt
                    }
                    else if (section.Type === "Table") {
                        sections[key] = {
                            headers: section.Headers.split(','),
                            rows: section.Content
                        }
                    }
                    else {
                        sections[key] = section.Content;
                    }

                }
            });

            return {
                id: post.id,
                Title: post.Title,
                Category: post.Category,
                FPic: post.FPic,
                FPicAlt: post.FPicAlt,
                ...sections,
                faqsEntriesNum: post.faqs.length,
                faqs: post.faqs,
                RelatedPosts: post.RelatedPosts,
                NumOfEntries: post.NumOfEntries,
                metaTitle: post.MetaTitle,
                metaDescription: post.MetaDescription,
                metaPermalink: post.Permalink,
                keywords: post.Keywords,
                PublishingDate: post.PublishingDate,

            };
        });
        return formattedData
    }
    catch (err) {
        console.error(err)
    }
}
export async function getPostByLink(Permalink) {
    try {
        await pool.query('SET SESSION max_statement_time = 100;')
        // Fetch main post details
        const [postRows] = await pool.query(`
            SELECT 
                id AS Blog_id, 
                Title AS Blog_Title, 
                Category, 
                MetaTitle, 
                MetaDescription, 
                Permalink, 
                Keywords, 
                RelatedPosts, 
                NumOfEntries, 
                PublishingDate
            FROM Posts 
            WHERE Permalink = ? 
            LIMIT 1;
        `, [Permalink]);

        if (postRows.length === 0) return null;

        const post = postRows[0];

        // Fetch sections
        const [sections] = await pool.query(`
            SELECT 
                OrderNumber AS Section_OrderNum, 
                SectionType, 
                AnchorLink, 
                Content AS Section_Content
            FROM Sections 
            WHERE Post_id = ? 
            ORDER BY OrderNumber;
        `, [post.Blog_id]);

        // Fetch images
        const [images] = await pool.query(`
            SELECT 
                ImgOrderNum AS Image_OrderNum, 
                SectionType AS Image_Type, 
                ImgPath AS Image_Path, 
                ImgAlt AS Image_Alt
            FROM Images 
            WHERE Post_id = ? 
            ORDER BY ImgOrderNum;
        `, [post.Blog_id]);

        // Fetch tables
        const [tables] = await pool.query(`
            SELECT 
                OrderNum AS Table_OrderNum, 
                Headers AS Table_Headers, 
                Table_content
            FROM BlogTables 
            WHERE Post_id = ? 
            ORDER BY OrderNum;
        `, [post.Blog_id]);

        // Fetch FAQs
        const [faqs] = await pool.query(`
            SELECT 
                id AS Faq_id, 
                Que AS Faq_Que, 
                Ans AS Faq_Ans
            FROM Qna 
            WHERE Post_id = ?;
        `, [post.Blog_id]);

        // Process Sections
        const formattedSections = [];
        const formattedData = {};

        sections.forEach(section => {
            const { Section_OrderNum, SectionType, Section_Content, AnchorLink } = section;

            if (SectionType === "para" || SectionType === "head" || SectionType === "anchor") {
                formattedSections.push({
                    Section_OrderNum,
                    Type: SectionType,
                    Content: Section_Content,
                    AnchorLink,
                });
            }

            const keyPrefix =
                SectionType === "para" ? "Para" :
                SectionType === "head" ? "Head" :
                SectionType === "anchor" ? "AnchorWord" : null;

            if (keyPrefix) {
                formattedData[`${keyPrefix}${Section_OrderNum}`] = Section_Content;
                if (SectionType === "anchor") {
                    formattedData[`AnchorLink${Section_OrderNum}`] = AnchorLink;
                }
            }
        });

        // Process Images
        let featureImage = null, featureImageAlt = null;
        images.forEach(image => {
            if (image.Image_Type === "Featuring_Image") {
                featureImage = image.Image_Path;
                featureImageAlt = image.Image_Alt;
            } else {
                formattedSections.push({
                    Section_OrderNum: image.Image_OrderNum,
                    Type: "Img",
                    ImgPath: image.Image_Path,
                    ImgAlt: image.Image_Alt,
                });

                formattedData[`Pic${image.Image_OrderNum}`] = image.Image_Path;
                formattedData[`AltPic${image.Image_OrderNum}`] = image.Image_Alt;
            }
        });

        // Process Tables
        tables.forEach(table => {
            formattedSections.push({
                Section_OrderNum: table.Table_OrderNum,
                Type: "Table",
                Headers: table.Table_Headers.split(','),
                Content: JSON.parse(table.Table_content),
            });

            formattedData[`table${table.Table_OrderNum}`] = {
                headers: table.Table_Headers.split(','),
                rows: JSON.parse(table.Table_content),
            };
        });

        // Process FAQs
        const formattedFAQs = faqs.map(faq => ({
            id: faq.Faq_id,
            [`Qs${faq.Faq_id}`]: faq.Faq_Que,
            [`Ans${faq.Faq_id}`]: faq.Faq_Ans,
        }));

        // Construct Final Object
        return {
            id: post.Blog_id,
            Title: post.Blog_Title,
            Category: post.Category,
            FPic: featureImage,
            FPicAlt: featureImageAlt,
            ...formattedData,
            faqs: formattedFAQs,
            RelatedPosts: post.RelatedPosts ? post.RelatedPosts.split(',') : [],
            NumOfEntries: post.NumOfEntries,
            metaTitle: post.MetaTitle,
            metaDescription: post.MetaDescription,
            metaPermalink: post.Permalink,
            keywords: post.Keywords,
            PublishingDate: post.PublishingDate,
        };
    } catch (err) {
        console.error(err);
        return null;
    }
}
export async function getPostById(postId) {
    try {
        await pool.query('SET SESSION max_statement_time = 100;')
        // Fetch main post details
        const [postRows] = await pool.query(`
            SELECT 
                id AS Blog_id, 
                Title AS Blog_Title, 
                Category, 
                MetaTitle, 
                MetaDescription, 
                Permalink, 
                Keywords, 
                RelatedPosts, 
                NumOfEntries, 
                PublishingDate
            FROM Posts 
            WHERE id = ? 
            LIMIT 1;
        `, [postId]);

        if (postRows.length === 0) return null;

        const post = postRows[0];

        // Fetch sections
        const [sections] = await pool.query(`
            SELECT 
                OrderNumber AS Section_OrderNum, 
                SectionType, 
                AnchorLink, 
                Content AS Section_Content
            FROM Sections 
            WHERE Post_id = ? 
            ORDER BY OrderNumber;
        `, [post.Blog_id]);

        // Fetch images
        const [images] = await pool.query(`
            SELECT 
                ImgOrderNum AS Image_OrderNum, 
                SectionType AS Image_Type, 
                ImgPath AS Image_Path, 
                ImgAlt AS Image_Alt
            FROM Images 
            WHERE Post_id = ? 
            ORDER BY ImgOrderNum;
        `, [post.Blog_id]);

        // Fetch tables
        const [tables] = await pool.query(`
            SELECT 
                OrderNum AS Table_OrderNum, 
                Headers AS Table_Headers, 
                Table_content
            FROM BlogTables 
            WHERE Post_id = ? 
            ORDER BY OrderNum;
        `, [post.Blog_id]);

        // Fetch FAQs
        const [faqs] = await pool.query(`
            SELECT 
                id AS Faq_id, 
                Que AS Faq_Que, 
                Ans AS Faq_Ans
            FROM Qna 
            WHERE Post_id = ?;
        `, [post.Blog_id]);

        // Process Sections
        const formattedSections = [];

        sections.forEach(section => {
            const { Section_OrderNum, SectionType, Section_Content, AnchorLink } = section;

            if (SectionType === "para" || SectionType === "head" || SectionType === "anchor") {
                formattedSections.push({
                    Section_OrderNum,
                    Type: SectionType,
                    Content: Section_Content,
                    AnchorLink,
                });
            }
        });

        // Process Images
        let featureImage = null, featureImageAlt = null;
        images.forEach(image => {
            if (image.Image_Type === "Featuring_Image") {
                featureImage = image.Image_Path;
                featureImageAlt = image.Image_Alt;
            } else {
                formattedSections.push({
                    Section_OrderNum: image.Image_OrderNum,
                    Type: "Img",
                    ImgPath: image.Image_Path,
                    ImgAlt: image.Image_Alt,
                });
            }
        });

        // Process Tables
        tables.forEach(table => {
            formattedSections.push({
                Section_OrderNum: table.Table_OrderNum,
                Type: "Table",
                Headers: table.Table_Headers.split(','),
                Content: JSON.parse(table.Table_content),
            });
        });

        // Process FAQs
        const formattedFAQs = faqs.map(faq => ({
            id: faq.Faq_id,
            [`Qs${faq.Faq_id}`]: faq.Faq_Que,
            [`Ans${faq.Faq_id}`]: faq.Faq_Ans,
        }));

        // Construct Final Object
        return {
            id: post.Blog_id,
            Title: post.Blog_Title,
            Category: post.Category,
            FPic: featureImage,
            FPicAlt: featureImageAlt,
            Sections: formattedSections,
            faqs: formattedFAQs,
            RelatedPosts: post.RelatedPosts ? post.RelatedPosts.split(',') : [],
            NumOfEntries: post.NumOfEntries,
            MetaTitle: post.MetaTitle,
            MetaDescription: post.MetaDescription,
            Permalink: post.Permalink,
            Keywords: post.Keywords,
            PublishingDate: post.PublishingDate,
        };
    } catch (err) {
        console.error(err);
        return null;
    }
}
export async function DeleteAFolderFromCloudinary(folderName) {
    try {
        if (!folderName) return false;

        // Fetch images first
        let resources = await cloudinary.v2.api.resources({
            type: "upload",
            prefix: folderName, 
            max_results: 500
        });

        if (resources.resources.length > 0) {
            const publicIds = resources.resources.map(file => file.public_id);

            await cloudinary.v2.api.delete_resources(publicIds);

            // Wait 5 seconds to ensure Cloudinary processes the deletion
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Fetch again to confirm all images are gone
            resources = await cloudinary.v2.api.resources({
                type: "upload",
                prefix: folderName
            });

            if (resources.resources.length > 0) {
                console.error("Delete error: Some images were not removed:", resources.resources);
                return false;
            }
        }

        await cloudinary.v2.api.delete_folder(folderName);
        return true;
    } catch (err) {
        if (err.error?.message === `Can't find folder with path ${folderName}`) {
            return true; 
        }
        console.error(err);
        return false;
    }
}
export async function DestroyImages(publicID) {
    try {
        if (!publicID) {
            console.error("Public ID is required");
            return false;
        }

        const response = await cloudinary.v2.uploader.destroy(publicID)
        return true
    } catch (error) {
        console.error(`Error deleting image ${publicID}:`, error);
        return false;
    }
}
export async function getAllForNavAndAP() {
    try {
        const [rows] = await pool.query(`
        SELECT
        P.id,
        P.Title,
        P.Permalink,
        P.PublishingDate
        FROM Posts P
        ORDER BY P.id;
        `)

        const posts = {};

        rows.forEach(row => {
            const {
                id,
                Title,
                Permalink,
                PublishingDate,
            } = row

            if (!posts[id]) {
                posts[id] = {
                    id,
                    Title,
                    Permalink,
                    PublishingDate,
                };
            }
        })
        const formattedData = Object.values(posts).map(post => {
            return {
                id: post.id,
                Title: post.Title,
                metaPermalink: post.Permalink,
                PublishingDate: post.PublishingDate,
            };
        });
        return formattedData
    }
    catch (err) {
        console.error(err)
    }
}
export async function getOneForCard(Id) {
    try {
        const [rows] = await pool.query(`
        SELECT DISTINCT
        P.id,
        P.Title,
        P.Permalink,
        P.PublishingDate,
        I.SectionType AS Image_Type,
        I.ImgPath AS Image_Path,
        I.ImgAlt AS Image_Alt
        FROM Posts P
        LEFT JOIN Images I ON P.id = I.Post_id
        ORDER BY P.id;
        `)

        const posts = {};

        rows.forEach(row => {
            const {
                id,
                Title,
                Permalink,
                PublishingDate,
                Image_Type,
                Image_Path,
                Image_Alt,
            } = row

            if (!posts[id]) {
                posts[id] = {
                    id,
                    Title,
                    Permalink,
                    PublishingDate,
                    Image_Type,
                    Image_Path,
                    Image_Alt,
                };
            }
            if (Image_Type === "Featuring_Image") {
                posts[id].FPic = Image_Path;
                posts[id].FPicAlt = Image_Alt;
            }
        })
        const formattedData = Object.values(posts).map(post => {
            return {
                id: post.id,
                Title: post.Title,
                metaPermalink: post.Permalink,
                PublishingDate: post.PublishingDate,
                FPic: post.FPic,
                FPicAlt: post.FPicAlt,
            };
        });
        const Final = formattedData.find(post => post.id === Number(Id));
        return Final
    }
    catch (err) {
        console.error(err)
    }
}
export async function getIdOfAll() {
    try {
        const [rows] = await pool.query(`
        SELECT
        P.id
        FROM Posts P
        ORDER BY P.id;
        `)

        const posts = {};

        rows.forEach(row => {
            const {
                id,
            } = row

            if (!posts[id]) {
                posts[id] = {
                    id,
                };
            }
        })
        const formattedData = Object.values(posts).map(post => {
            return {
                id: post.id,
            };
        });

        return formattedData
    }
    catch (err) {
        console.error(err)
    }
}
export async function getAllForCategories() {
    try {
        const [rows] = await pool.query(`
        SELECT
        P.id,
        P.Category
        FROM Posts P
        ORDER BY P.id;
        `)

        const posts = {};

        rows.forEach(row => {
            const {
                id,
                Category,
            } = row

            if (!posts[id]) {
                posts[id] = {
                    id,
                    Category,
                };
            }
        })
        const formattedData = Object.values(posts).map(post => {
            return {
                id: post.id,
                Category: post.Category
            };
        });
        return formattedData
    }
    catch (err) {
        console.error(err)
    }
}
export async function getScripts() {
    try {
        const [rows] = await pool.query(`
        SELECT
        S.id,
        S.ScriptCategory,
        S.ScriptType,
        S.ScriptContent
        FROM Scripts S
        ORDER BY S.id;
        `)

        const Scripts = [];

        rows.forEach(row => {
            let existingObject = Scripts.find((script) => script.ScriptCategory === row.ScriptCategory)
            const {
                id,
                ScriptCategory,
                ScriptType,
                ScriptContent
            } = row

            if (!existingObject) {
                existingObject = {
                    id,
                    ScriptCategory,
                    Sections: [{
                        ScriptType: ScriptType,
                        ScriptContent: ScriptContent
                    }]
                }
                Scripts.push(existingObject)
            }
            else {
                existingObject.Sections.push({
                    ScriptType: ScriptType,
                    ScriptContent: ScriptContent
                })
            }
        })
        return Scripts
    }
    catch (err) {
        console.error(err)
    }
}
export async function getOthers() {
    try {
        const [rows] = await pool.query(`
            SELECT
            id, 
            Title, 
            Section_type, 
            Content, 
            OrderNum, 
            UpdatedAt
            FROM Others
            ORDER BY id, OrderNum
            `)

        let data = [];

        rows.forEach(row => {
            let existingObject = data.find((obj) => obj.Title === row.Title);

            if (!existingObject) {
                existingObject = {
                    Title: row.Title,
                    UpdatedDate: row.UpdatedAt,
                    Sections: [{
                        SectionType: row.Section_type,
                        Section_OrderNum: row.OrderNum,
                        Content: row.Content,
                    }],
                    NumOfEntries: 0,
                };
                data.push(existingObject);
            }
            else {
                existingObject.Sections.push({
                    SectionType: row.Section_type,
                    Section_OrderNum: row.OrderNum,
                    Content: row.Content,
                })

                if (row.OrderNum > existingObject.NumOfEntries) {
                    existingObject.NumOfEntries = row.OrderNum;
                }
            }

        })

        const Final = ["PP", "A", "TC"].map((title, index) => {
            const match = data.find((item) => item.Title === title);
            if (match) {
                return {
                    id: index,
                    Title: title,
                    NumOfEntries: match.NumOfEntries,
                    Sections: match.Sections,
                    UpdatedDate: match.UpdatedDate || null,
                };
            } else {
                return { Title: title }
            }
        })
        return Final
    }
    catch (err) {
        console.error(err)
    }
}
export async function getPrivacyPolicyForAdmin() {
    try {
        const Arr = await getOthers()
        const PParr = Arr.find(post => post.Title === "PP")
        return PParr
    }
    catch (err) {
        console.log(err)
    }
}
export async function getTermsAndConditionsForAdmin() {
    try {
        const Arr = await getOthers()
        const PParr = Arr.find(post => post.Title === "TC")
        return PParr
    }
    catch (err) {
        console.log(err)
    }
}
export async function getAboutForAdmin() {
    try {
        const Arr = await getOthers()
        const PParr = Arr.find(post => post.Title === "A")
        return PParr
    }
    catch (err) {
        console.log(err)
    }
}
export async function getPrivacyPolicy() {
    try {
        const Arr = await getOthers()
        const PParr = Arr.find(post => post.Title === "PP")
        let Final = {}

        PParr.Sections.map((section) => {
            if (section.SectionType === "para") {
                Final = {
                    ...Final,
                    [`Para${section.Section_OrderNum}`]: section.Content
                }
            }
            else if (section.SectionType === "head") {
                Final = {
                    ...Final,
                    [`Head${section.Section_OrderNum}`]: section.Content
                }
            }
        })

        Final = {
            Title: PParr.Title,
            NumOfEntries: PParr.NumOfEntries,
            ...Final,
            UpdatedDate: PParr.UpdatedDate
        }
        return Final
    }
    catch (err) {
        console.error(err)
    }
}
export async function getTermsAndConditions() {
    try {
        const Arr = await getOthers()
        const PParr = Arr.find(post => post.Title === "TC")
        let Final = {}

        PParr.Sections.map((section) => {
            if (section.SectionType === "para") {
                Final = {
                    ...Final,
                    [`Para${section.Section_OrderNum}`]: section.Content
                }
            }
            else if (section.SectionType === "head") {
                Final = {
                    ...Final,
                    [`Head${section.Section_OrderNum}`]: section.Content
                }
            }
        })

        Final = {
            Title: PParr.Title,
            NumOfEntries: PParr.NumOfEntries,
            ...Final,
            UpdatedDate: PParr.UpdatedDate
        }
        return Final
    }
    catch (err) {
        console.error(err)
    }
}
export async function getAbout() {
    try {
        const Arr = await getOthers()
        const PParr = Arr.find(post => post.Title === "A")
        let Final = {}

        PParr.Sections.map((section) => {
            if (section.SectionType === "para") {
                Final = {
                    ...Final,
                    [`Para${section.Section_OrderNum}`]: section.Content
                }
            }
            else if (section.SectionType === "head") {
                Final = {
                    ...Final,
                    [`Head${section.Section_OrderNum}`]: section.Content
                }
            }
        })

        Final = {
            Title: PParr.Title,
            NumOfEntries: PParr.NumOfEntries,
            ...Final,
            UpdatedDate: PParr.UpdatedDate
        }
        return Final
    }
    catch (err) {
        console.error(err)
    }
}
export async function getCreds() {
    try {
        const [rows] = await pool.query(`
        SELECT
        C.id,
        C.Username,
        C.Password
        FROM Credentials C
        ORDER BY C.id;
        `)
        return rows[0]
    }
    catch (err) {
        console.error(err)
    }
}
export async function backupFolder(folderName, backupFolderName) {
    try {
        // Fetch all files in the original folder
        const resources = await cloudinary.v2.api.resources({
            type: "upload",
            prefix: folderName
        });

        if (resources.resources.length === 0) {
            return true;
        }

        for (const resource of resources.resources) {
            const publicId = resource.public_id;
            const newPublicId = publicId.replace(folderName, backupFolderName);

            // Upload the same image to the backup folder instead of renaming
            await cloudinary.v2.uploader.upload(resource.secure_url, {
                public_id: newPublicId,
                folder: backupFolderName
            });
        }
        return true;
    } catch (err) {
        console.error("Error in folder backup:", err);
        return false;
    }
}
export async function revertFolder(backupFolderName, originalFolderName) {
    try {

        // Fetch all files in the backup folder
        const resources = await cloudinary.v2.api.resources({
            type: "upload",
            prefix: backupFolderName
        });

        if (resources.resources.length === 0) {
            return false;
        }

        for (const resource of resources.resources) {
            const backupPublicId = resource.public_id;
            const originalPublicId = backupPublicId.replace(backupFolderName, originalFolderName);

            // Upload the image back to the original folder instead of renaming
            await cloudinary.v2.uploader.upload(resource.secure_url, {
                public_id: originalPublicId,
                folder: originalFolderName
            });
        }
        return true;
    } catch (err) {
        console.error("Error in folder revert:", err);
        return false;
    }
}
export async function UploadNewBlog(blog) {
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const sections = blog.Sections
        const faqs = blog.faqs ? blog.faqs : []
        const rp = blog.RelatedPosts
        const RelatedPosts = rp.length > 0 ? rp.join(',') : null

        if(RelatedPosts === null){
            await connection.query(`
                INSERT INTO Posts (id, Title, Category, MetaTitle, MetaDescription, Permalink, Keywords, NumOfEntries)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                Title = VALUES(Title),
                Category = VALUES(Category),
                MetaTitle = VALUES(MetaTitle),
                MetaDescription = VALUES(MetaDescription),
                Permalink = VALUES(Permalink),
                Keywords = VALUES(Keywords),
                NumOfEntries = VALUES(NumOfEntries)
                `, [blog.id, blog.Title, blog.Category, blog.MetaTitle, blog.MetaDescription, blog.Permalink, blog.Keywords, blog.NumOfEntries]
            )
        }
        else{
            await connection.query(`
                INSERT INTO Posts (id, Title, Category, MetaTitle, MetaDescription, Permalink, Keywords, RelatedPosts, NumOfEntries)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                Title = VALUES(Title),
                Category = VALUES(Category),
                MetaTitle = VALUES(MetaTitle),
                MetaDescription = VALUES(MetaDescription),
                Permalink = VALUES(Permalink),
                Keywords = VALUES(Keywords),
                RelatedPosts = VALUES(RelatedPosts),
                NumOfEntries = VALUES(NumOfEntries)
                `, [blog.id, blog.Title, blog.Category, blog.MetaTitle, blog.MetaDescription, blog.Permalink, blog.Keywords, RelatedPosts, blog.NumOfEntries]
            )
        }

        await connection.query(`DELETE FROM Sections WHERE Post_id = ?`, [blog.id])
        await connection.query(`DELETE FROM Images WHERE Post_id = ?`, [blog.id])
        await connection.query(`DELETE FROM BlogTables WHERE Post_id = ?`, [blog.id])
        await connection.query(`DELETE FROM Qna WHERE Post_id = ?`, [blog.id])

        await connection.query(`
            INSERT INTO Images (Post_id, SectionType, ImgPath, ImgAlt, ImgOrderNum)
            VALUES(?, ?, ?, ?, ?)
            `, [blog.id, "Featuring_Image", blog.FPic, blog.FPicAlt, 1]
        )
        for (const section of sections) {
            if (section.Type === 'head' || section.Type === 'para' || section.Type === 'anchor') {
                await connection.query(`
                    INSERT INTO Sections (Post_id, SectionType, AnchorLink, Content, OrderNumber)
                    VALUES(?, ?, ?, ?, ?)
                    `, [blog.id, section.Type, section.AnchorLink, section.Content, section.Section_OrderNum]
                )
            }
            else if (section.Type === 'Img') {
                await connection.query(`
                    INSERT INTO Images (Post_id, SectionType, ImgPath, ImgAlt, ImgOrderNum)
                    VALUES(?, ?, ?, ?, ?)
                    `, [blog.id, section.Type, section.ImgPath, section.ImgAlt, section.Section_OrderNum]
                )
            }
            else if (section.Type === 'Table') {
                const content = JSON.stringify(section.Content)
                const headers = section.Headers.join(',')
                await connection.query(`
                    INSERT INTO BlogTables (Post_id, Headers, Table_content, OrderNum)
                    VALUES(?, ?, ?, ?)
                    `, [blog.id, headers, content, section.Section_OrderNum]
                )
            }
        }
        if (faqs.length > 0) {
            for (const faq of faqs) {
                const question = faq[`Qs${faq.id}`]
                const answer = faq[`Ans${faq.id}`]
                await connection.query(`
                    INSERT INTO Qna (id, Post_id, Que, Ans)
                    VALUES(?, ?, ?, ?)
                    `, [faq.id, blog.id, question, answer]
                )
            }
        }
        await connection.commit()
        return true
    }
    catch (err) {
        await connection.rollback()
        console.error(err)
        return false
    }
    finally {
        connection.release()
    }
}
export async function UploadNewOthers(item) {
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const sections = item.Sections

        await connection.query("DELETE FROM Others WHERE `Others`.`Title` = ?", item.Title)

        for (const section of sections) {
            if (section.SectionType === 'head' || section.SectionType === 'para') {
                if (Number(section.Section_OrderNum) === 1) {
                    await connection.query(`
                        INSERT INTO Others (Title, Section_type, Content, OrderNum, UpdatedAt)
                        VALUES(?, ?, ?, ?, ?)
                        `, [item.Title, section.SectionType, section.Content, section.Section_OrderNum, item.UpdatedDate]
                    )
                }
                else {
                    await connection.query(`
                        INSERT INTO Others (Title, Section_type, Content, OrderNum, UpdatedAt)
                        VALUES(?, ?, ?, ?, ?)
                        `, [item.Title, section.SectionType, section.Content, section.Section_OrderNum, null]
                    )
                }
            }
        }

        await connection.commit()
        return true
    }
    catch (err) {
        await connection.rollback()
        console.error(err)
        return false
    }
    finally {
        connection.release()
    }
}
export async function UploadNewScripts(item) {
    const connection = await pool.getConnection()
    try {
        if (item.ScriptCategory === 'analytics') {
            await connection.beginTransaction()
            await connection.query("DELETE FROM Scripts WHERE `Scripts`.`ScriptCategory` = ?", item.ScriptCategory)

            await connection.query(`
                INSERT INTO Scripts (id, ScriptCategory, ScriptType, ScriptContent)
                VALUES(?, ?, ?, ?)
                `, [item.id, item.ScriptCategory, item.Sections[0].ScriptType, item.Sections[0].ScriptContent]
            )
        }
        else {
            await connection.beginTransaction()
            await connection.query("DELETE FROM Scripts WHERE `Scripts`.`ScriptCategory` = ?", item.ScriptCategory)

            await connection.query(`
                INSERT INTO Scripts (ScriptCategory, ScriptType, ScriptContent)
                VALUES(?, ?, ?)
                `, [item.ScriptCategory, item.Sections[0].ScriptType, item.Sections[0].ScriptContent]
            )
            await connection.query(`
                INSERT INTO Scripts (ScriptCategory, ScriptType, ScriptContent)
                VALUES(?, ?, ?)
                `, [item.ScriptCategory, item.Sections[1].ScriptType, item.Sections[1].ScriptContent]
            )
        }
        await connection.commit()
        return true
    }
    catch (err) {
        console.error(err)
        await connection.rollback()
        return false
    }
    finally {
        connection.release()
    }
}
export async function ChangeCreds(creds) {
    const connection = await pool.getConnection()
    try {
        const NewUsername = creds.NewUsername
        const NewPassword = creds.NewPassword
        await connection.beginTransaction()
        await connection.query('DELETE FROM Credentials')
        await connection.query(`
            INSERT INTO Credentials (Username, Password)
            VALUES(?, ?)
            `, [NewUsername, NewPassword])
        await connection.commit()
        return true
    }
    catch (err) {
        console.error(err)
        await connection.rollback()
        return false
    }
    finally {
        connection.release()
    }
}
export async function DeleteABlog(id) {
    try {
        pool.query("DELETE FROM Posts WHERE `Posts`.`id` = ?", id)
        return true
    }
    catch (err) {
        console.error(err)
        return false
    }
}
