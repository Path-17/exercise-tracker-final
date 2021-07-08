const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const {MongoClient} = require('mongodb');

// Google auth
const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = '928066123608-m1g7eo3dnq77dd95le32c0m6igbe6mc4.apps.googleusercontent.com'
const client = new OAuth2Client(CLIENT_ID);

const PORT = process.env.PORT || 5000;

// DB INITIALIZATION
const uri = 'mongodb+srv://admin:kalabrousk@cluster0.60hqf.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const DBclient = new MongoClient(uri, { useUnifiedTopology: true });
DBclient.connect();

// Middleware
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());

// creating public directory
app.use(express.static(__dirname + '/public'));

// routing
app.get('/', (req,res) => {
    res.render("login")
})

app.get('/login', (req,res) =>{
    res.render("login")
})

app.post('/login', (req, res) =>{
    let token = req.body.token;
    let userid;
    let userData;
    

    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token, 
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        userData = payload;
        userid = payload['sub'];
    }
    verify()
    .then(()=>{
        addUserToDB(userData, userid);
        res.cookie('session-token', token);
        res.send('success');
    })

})

app.get('/dashboard', checkAuthenticated, (req,res)=>{
    let user = req.user;
    res.render('dashboard', {user})
})

app.get('/history',checkAuthenticated, (req,res)=>{
    res.render('history');
})

app.get('/log-a-workout',checkAuthenticated, (req,res)=>{
    res.render('logworkout');
})

app.get('/create-template',checkAuthenticated, (req,res)=>{
    res.render('createtemplate');
})

app.post('/template-post', checkAuthenticated, (req, res) =>{
    const userid = req.user.id;
    const template = req.body;

    // append the template to the db
    addTemplateToDB(userid, template);
})

app.get('/logout', (req,res)=>{
    res.clearCookie('session-token');
    res.redirect('/login');
})

app.get('/user-info', checkAuthenticated, async (req, res)=>{
    const userid = req.user.id;
    const userData = await getUserData(userid);
    console.log(userData)
    res.json(userData);
    
})

function checkAuthenticated(req, res, next){

    let token = req.cookies['session-token'];

    let user = {};
    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        user.name = payload.name;
        user.email = payload.email;
        user.picture = payload.picture;
        user.id = payload.sub;
      }
      verify()
      .then(()=>{
          req.user = user;
          next();
      })
      .catch(err=>{
          res.redirect('/login')
      })

}

app.listen(PORT, ()=>{
    console.log("App running on port:" + String(PORT));
})


// time to build the database

var defaultExerciseList = [
    'Alternating Dumbell Curls',
    'Back Squat',
    'Bench Press',
    'Bent Over Row',
    'Deadlift',
    'Dumbell Hammer Curls',
    'Front Squat',
    'Incline Bench Press',
    'Lateral Raises',
    'Overhead Press',
    'Overhead Tricep Extension',
    'Pendlay Row',
    'Pull-Up',
    'Push-Up',
    'Skullcrushers',
    'Tricep Pushdown'
]

class user{
    constructor(name, defaultExerciseList, id){
        this.name = name;
        this.exerciseList = defaultExerciseList;
        this.templateList = [];
        this.workoutList = [];
        this.exerciseHistory = [];
        this.settings = {
            units: "lb",
        }
        this._id = id;
    }
}

class workoutTemplate{
    constructor(exerciseList, name){
        this.exerciseList = [];
        this.name = name;
    }
}

class exercise{
    constructor(name, repWeightPairs, bw_or_pc){
        this.name = name;
        this.repWeightPairs = repWeightPairs;
        this.bodyweight = bodyweight
        if(bw_or_pc === "bodyweight") this.modifier = "bodyweight";
        else if(bw_or_pc === "percentage") this.modifier = "percentage";
        else this.modifier = "normal";
    }
}

async function addUserToDB(userData, userid){
    let inDB = await DBclient.db('usersDB').collection('Users').findOne({"_id": userid});
    if(!inDB){
        const newUser = new user(userData.given_name, defaultExerciseList, userid);
        DBclient.db('usersDB').collection('Users').insertOne(newUser);
        console.log("Inserted new user:\n", newUser);
    }

}

async function addTemplateToDB(userid, template){
    DBclient.db('usersDB').collection('Users').updateOne({"_id": userid}, {"$push": {"templateList": template}});
}

async function getUserData(userid){
    let returnVal;
    try{
        returnVal = DBclient.db('usersDB').collection('Users').findOne({"_id": userid});
    }catch{
        returnVal = false;
    }
    return returnVal;
}
