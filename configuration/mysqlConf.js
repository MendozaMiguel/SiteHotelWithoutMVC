/*
Permet de faire par exemple dans le projet un simple
const connSql = require('./configuration/mysqlConf');
puis connSql.query("SELECT * ...

 */


const mysql = require('mysql');
const connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : "root",
    database : 'hotel'
});


connection.connect(function(err) {
    if (err) throw "impossible d'établir la connection merci de verfifier les identifiants"+err;
});

module.exports = connection;
