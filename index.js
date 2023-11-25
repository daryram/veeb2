const express = require('express');
const app = express();
const fs = require('fs');
const mysql = require('mysql2');
const bodyparser = require('body-parser');
const dateInfo = require('./dateTimeFnc');
const dbConfig = require('../../vp23config');
const multer = require('multer');
//seame multer jaoks vahevara, mis määrab üleslaadimise kataloogi
const upload = multer({dest: './public/gallery/orig/'});
const mime = require('mime');
const sharp = require('sharp');
const async = require('async');


app.set('view engine', 'ejs');
app.use(express.static('public'));
//app.use(bodyparser.urlencoded({extended: false}));
app.use(bodyparser.urlencoded({extended: true}));

//loon andmebaasi ühenduse siia
const connection = mysql.createConnection({
	host: dbConfig.configData.host,
	user: dbConfig.configData.user,
	password: dbConfig.configData.password,
	database: 'if23_daria_bayram'
});

//route lehele 5201 ja 5201/wisdom
app.get('/', (req, res)=>{
	//res.send('See töötab'); - seda enam ei taha
	res.render('index');
});

app.get('/timenow', (req, res)=>{ //siia panen timenow sedasi, sest see on fail mitte funktsioon
	const dateNow = dateInfo.dateNowET();
	const timeNow = dateInfo.timeNowET();
	res.render('timenow', {dateN: dateNow, timeN: timeNow});
});

app.get('/wisdom', (req, res)=>{
	let folkWisdom = [];
	fs.readFile("public/txtfiles/vanasonad.txt", "utf8", (err,data)=>{
		if(err){
			console.log(err);
		}
		else{
			folkWisdom = data.split(";");
			res.render('justlist', {h1: 'Vanasõnad', wisdoms: folkWisdom});
		}
	});
	
});

//siin on log.txt fail

app.get('/log', (req, res)=>{
	let textLog = [];
	fs.readFile("public/txtfiles/log.txt", "utf8", (err,data)=>{
		if(err){
			console.log(err);
		}
		else{
			textLog = data.split(";").map((logItem) => {
				const nameDateArray = logItem.split(',');
				return {
					first_name: nameDateArray[0],
					last_name: nameDateArray[1],
					date: new Date(nameDateArray[2]).toLocaleDateString('et-EE')
				}
			});
			res.render('log', {h1: 'Logi', log: textLog});
		}
	});
	
});

app.get('/eestifilm', (req, res)=>{
	res.render('eestifilmindex');
});

app.get('/eestifilm/filmiloend', (req, res)=>{
	let sql = 'SELECT title, production_year FROM movie';
	let sqlresult = [];
	connection.query(sql, (err, result)=>{
		if (err) {
			throw err;
			res.render('eestifilmlist', {filmlist: sqlresult});
		}
		else{
			//console.log(result);
			//console.log(result[4].title);
			sqlresult = result;
			res.render('eestifilmlist', {filmlist: sqlresult});
		}
	});
});

app.get('/eestifilm/lisapersoon', (req, res)=>{
	res.render('eestifilmaddperson');
});

app.get('/eestifilm/lisaseos', (req, res)=>{
	//console.log("filmiseos");
	//paneme async mooduli abil korraga tööle mitte asja
	//1) loome tegevuste loendi
	const myQueries = [
		function(callback){
			connection.execute('select id, title from movie', (err, result)=>{
				if(err) {
					return callback(err);
				}
				else{
					return callback(null, result);
				}

			});
		},
		function(callback) {
			connection.execute('select id, first_name, last_name from person', (err, result)=>{
				if(err) {
					return callback(err);
				}
				else{
					return callback(null, result);
				}

			});
		},
		function(callback) {
			connection.execute('select id, position_name from position', (err, result)=>{
				if(err) {
					return callback(err);
				}
				else{
					return callback(null, result);
				}
	
			});
		}
	];
	
	//paneme need tegevused asünkroonselt paraleelselt tööle
	async.parallel(myQueries, (err, results)=>{
		if (err){
			throw err;
		}
		else {
			console.log(results);
			//mis kõik teha, ka render osa vajalike tükkidega
		}
	});


	res.render('eestifilmaddrelation');
});

app.get('/news/add', (req, res)=>{
	res.render('addnews');
});

app.get('/news', (req,res)=> {
	res.render('news');
});

app.post('/news/add', (req,res)=> {
	res.render('addnews');
	console.log(req.body);
	let notice = '';
	let sql  = 'INSERT INTO vp_news (title, content, expire, userid) VALUES (?, ?, ?, 1)'; //siin räägime andmetabelist
	connection.query(sql, [req.body.titleInput, req.body.contentInput, req.body.expiredDateInput], (err, result)=>{
		if(err) {
			throw err;
			notice = 'Andmete salvestamine ebaõnnestus' + err;
			res.render('addnews', {notice: notice});
		}
		else {
			notice = 'Uudise ' + req.body.titleInput + ' salvestamine õnnestus';
			res.render('addnews', {notice: notice});
		}
	});
});

app.get('/news/read', (req, res)=>{
    let sql ='select *  from vp_news';// where expire > "2023-10-10" and deleted is null order by id desc';//'SELECT title, production_year FROM movie';
    let sqlresult=[];
    connection.query(sql, (err, result)=>
    {
        if (err)
        {
            throw err;
        }
        else
        {
            //console.log(result);
            //console.log(result[4].title);
            sqlresult=result;
            //sconsole.log(sqlresult);
            res.render('readnews', {newslist:sqlresult});//, {filmlist:sqlresult});
        }
    });
    //);
});

app.get('/news/read/:id', (req,res)=> {
	//res.render('readnews');
	console.log(req.params);
	console.log(req.query);
	res.send('Vaatame uudist, mille id on: ' + req.params.id + '<h3>' + req.query.title + '</h3><p>Lisatud: lisamise kuupäev</p><p>Sisu</p>');
});

app.get('/photoupload', (req, res) => {
	res.render('photoupload');
});

app.post('/photoupload', upload.single('photoInput'), (req, res) => {
	let notice = '';
	console.log(req.file);
	console.log(req.body);
	//const mimeType = mime.getType(req.file.path);
	//console.log(mimeType);
	const fileName = 'vp_' + Date.now() + '.jpg';
	//fs.rename(req.file.path, './public/gallery/orig/' + req.file.originalname, (err) => {
		fs.rename(req.file.path, './public/gallery/orig/' + fileName, (err) => {
		console.log('Viga: ' + err);
	});
	const mimeType = mime.getType('./public/gallery/orig/' + fileName);
	console.log('tüüp: ' + mimeType);
	//loon pildist thumbnaili
	sharp('./public/gallery/orig/' + fileName).resize(800,600).jpeg({quality: 90}).toFile('./public/gallery/normal/' + fileName);
	sharp('./public/gallery/orig/' + fileName).resize(100,100).jpeg({quality: 90}).toFile('./public/gallery/thumbs/' + fileName);

	let sql  = 'INSERT INTO vp_gallery (filename, originalname, alttext, privacy, userid) VALUES (?, ?, ?, ?, ?)'; //siin räägime andmetabelist
	const userid = 1;
	connection.query(sql, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userid], (err, result)=>{
		if(err) {
			throw err;
			notice = 'Foto andmete salvestamine ebaõnnestus' + err;
			res.render('photoupload', {notice: notice});
		}
		else {
			notice = 'Pilt "' + req.file.originalname + '" laeti üles!';
			res.render('photoupload', {notice: notice});
		}
	});

	notice = 'Pilt "' + req.file.originalname + '" laeti üles!';
	
});

app.get('/photogallery', (req, res) =>{
	let sql = 'SELECT id, alttext, filename from vp_gallery where privacy > 1 and deleted is null order by id desc';
	let sqlresult = [];
	connection.query(sql, (err, result)=>{
		if (err) {
			throw err;
			res.render('photogalleryt', {photolist: sqlresult});
		}
		else{
			//console.log(result);
			//console.log(result[4].title);
			sqlresult = result;
			res.render('photogallery', {photolist: sqlresult});
		}
	});
});

app.post('/eestifilm/lisapersoon', (req, res)=>{
	console.log(req.body);
	let notice = '';
	let sql  = 'INSERT INTO person (first_name, last_name, birth_date) VALUES (?, ?, ?)'; //siin räägime andmetabelist
	connection.query(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput], (err, result)=>{
		if(err) {
			throw err;
			notice = 'Andmete salvestamine ebaõnnestus' + err;
			res.render('eestifilmaddperson', {notice: notice});
		}
		else {
			notice = 'Filmitegelase ' + req.body.firstNameInput + ' ' + req.body.lastNameInput + ' salvestamine õnnestus';
			res.render('eestifilmaddperson', {notice: notice});
		}
	});
});

app.listen(5201);