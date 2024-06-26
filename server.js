require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const ToDo = require('./todoSchema')
const bcrypt = require('bcryptjs')
const Users = require('./usersSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const Cache = require('node-cache')
const app = express()
const path = require('path')


async function connectMongoose() {
    await mongoose.connect('mongodb://localhost/remExpress')
}
connectMongoose()


app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'views')))



app.get('/', (req, res) => {
    res.render('home')
})
app.get('/homeData/:page', verifyToken, async (req, res) => {
    try {
        const user = await Users.findOne({ unique_id: req.user }, { '_id': 1 }).lean().exec()

        const count = await ToDo.countDocuments({ user_id: user._id, isConfirm: false })
        const page = parseInt(req.params.page)

        const todoData = await ToDo.find({ user_id: user._id, isConfirm: false }).lean().exec()

        for(let i = 0; i < todoData.length; i++){
            if(todoData[i].isFavourites === true){
                todoData.unshift(todoData[i])
                todoData.splice(i + 1, 1)
            }
        }
  
        res.json({ todoData: todoData.slice(page * 2, todoData.length).slice(0, 2), count, page })
        
    } catch (e) {
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: e.message });
    }

})

app.get('/registration', (req, res) => {
    res.render('registration')
})
app.post('/registration', async (req, res) => {
    try {
        const { username, password, mail } = req.body;

        if (!username || !password || !mail) {
            return res.json({ message: 'Provide the data.', color: '#f1abab' });
        }

        const isUserExists = await Users.findOne({ email: mail }, { '_id': 1 }).lean().exec()

        if (isUserExists) {
            return res.json({ lineColor: '#b85454', color: '#f1abab', message: `User with email - ${mail} already exists.` });
        }
        let randomMail = randomForMail()

        const nodemailerOptions = {
            from: {
                name: 'My site',
                address: process.env.MAIL,
            },
            to: mail,
            subject: 'Authentication code',
            text: `${randomMail}`,
            html: `<h1>${randomMail}</h1>`
        };

        transporter.sendMail(nodemailerOptions, (err, info) => {
            if (err) {
                console.log(err)
                return res.json({ lineColor: '#b85454', color: '#f1abab', message: err.message });
            }
        });

        const hashedPassword = await bcrypt.hash(password, 10)
        const codeForAuth = await bcrypt.hash(`${randomMail}`, 10)

        const user = await Users.create({
            username,
            password: hashedPassword,
            email: mail,
            codeForAuth,
            unique_id: randomId(),
            isVerificated: false,
            role: 'user'
        })

        const token = jwt.sign(user.unique_id, process.env.SECRET_JWT_KEY)

        res.json({ token })

    } catch (e) {
        console.log(e)
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: e.message });
    }
});



app.get('/login', (req, res) => {
    res.render('loginPage')
})



app.post('/login', async (req, res) => {
    try {
        const { password, email } = req.body

        const findUser = await Users.findOne({ email }).lean().exec()

        if (findUser) {
            const hashPassword = findUser.password

            const isPasswordMatch = await bcrypt.compare(password, hashPassword)
            if (isPasswordMatch) {
                const token = jwt.sign(findUser.unique_id, process.env.SECRET_JWT_KEY)

                return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "Successfully logining!", token});
            }

            return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Password didn't match!" });
        }

        return res.json({ lineColor: '#b85454', color: '#f1abab', message: "User does not exists!" });

    } catch (e) {
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: e.message });
    }
})



app.post('/verification-email', verifyToken, async (req, res) => {
    try {
        const { first, second, third, fourth } = req.body

        let strCode = first + second + third + fourth

        const user = await Users.findOne({ unique_id: req.user }).exec()

        if (!(await bcrypt.compare(strCode, user.codeForAuth))) {
            return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Code didn't match!" });
        }

        await user.updateOne({ isVerificated: true })

        return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "Successfully register" });
    } catch (e) {
        console.log(e.message)
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Something error" });
    }
})

app.get('/create-todo', async (req, res) => {
    res.render('createTodo')
})
app.post('/creat-todo', verifyToken, async (req, res) => {
    try {
        const { title, description, tags } = req.body

        let tagsSplit = tags.split(',')
        let tagsArr = []

        for (i of tagsSplit) {
            tagsArr.push(i.trim())
        }

        const user = await Users.findOne({ unique_id: req.user }, { '_id': 1 }).lean().exec()
        await ToDo.create({
            title,
            description,
            tags: tagsArr,
            isConfirm: false,
            user_id: user._id
        })
    } catch (e) {
        console.log(e.message)
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Something error" });
    }

    return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "Successfully create!" });
})





app.get('/tag-search-data/:tag', verifyToken, async (req, res) => {
    try {
        const tag = req.params.tag

        const user = await Users.findOne({ unique_id: req.user }, { '_id': 1 }).lean().exec()

        const count = await ToDo.countDocuments({ user_id: user._id, isConfirm: false })
        const page = parseInt(req.params.page)

        const todos = await ToDo.find({ isConfirm: false, user_id: user._id }).lean().exec()

        let listId = []

        for (i of todos) {
            for (j of i.tags) {
                if (j === tag) {
                    listId.push(i)
                }
            }
        }

        res.json({ listId, count, page })
    } catch (e) {
        console.log(e.message)
        return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "Successfully create!" });
    }

})


app.post('/complete/:postId', verifyToken, async (req, res) => {
    const postId = req.params.postId
    if (postId) {
        await ToDo.updateOne({ _id: postId }, { isConfirm: true })

        return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "Successfully updated!" });
    }f

    return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Something error" });
})


app.post('/favourites/:postId', verifyToken, async (req, res) => {
    const postId = req.params.postId
    if (postId) {
        await ToDo.updateOne({ _id: postId }, { isFavourites: true })

        return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "The post has been added to favourites!" });
    }

    return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Something error" });
})
app.post('/del-from-favourites/:postId', verifyToken, async (req, res) => {
    const postId = req.params.postId
    if (postId) {
        await ToDo.updateOne({ _id: postId }, { isFavourites: false })

        return res.json({ lineColor: '#dc9956', color: '#fec58c', message: "The post has been deleted from favourites!" });
    }

    return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Something error" });
})



app.delete('/delete/:postId', verifyToken, async (req, res) => {
    const postId = req.params.postId
    try {
        if (postId) {
            await ToDo.deleteOne({ _id: postId })

            return res.json({ lineColor: '#54b854', color: '#baf1ab', message: "Successfully deleted!" });
        }

        return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Something error" });
    } catch (e) {
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: e.message });
    }
})



//       OTHER

//    MAIL
let transporter = nodemailer.createTransport({
    secure: true,
    host: 'smtp.mail.ru',
    port: 465,
    auth: {
        user: process.env.MAIL,
        pass: process.env.MAIL_PASSWORD
    }
});

function randomForMail() {
    return Math.floor((Math.random() + 1000) * (Math.random() + 1))
}
//  END MAIl


async function verifyToken(req, res, next) {
    let token = req.headers.authorization

    if (!token) {
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Server error.1" });
    }
    if (!token.startsWith('Bearer')) {
        return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Server error.2" });
    }
    token = token.split(' ')[1]
    jwt.verify(token, process.env.SECRET_JWT_KEY, (err, decoded) => {
        if (err) return res.json({ lineColor: '#b85454', color: '#f1abab', message: "Please, authenticate" });
        req.user = decoded
        next()
    })
}

function randomLetter() {
    const s = '1234567890QWERTYUIOPASDFGHJKLZXCVBNM';
    const randomIndex = Math.floor(Math.random() * s.length);
    return s[randomIndex];
}

const globalUniqueIdStorage = []

function randomId() {
    let res = '';
    for (let i = 0; i < 6; i++) {
        res += randomLetter();
    }
    for (j of globalUniqueIdStorage) {
        if (res === j) {
            res = randomId()
        }
    }

    globalUniqueIdStorage.push(res)

    return res;
}

app.listen(5000)