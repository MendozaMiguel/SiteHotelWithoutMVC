//#######################################
//### DECLARATION DES MODULES
//#######################################
//Déclaration de notre connexion SQL
const connSql = require('./configuration/mysqlConf');
//Déclaration d'Express :
const express = require('express');
const app = express();
//Déclaration file-upload pour les images
const fileUpload = require('express-fileupload');
app.use(fileUpload());

//Pour recuperer les donnée des formulaire usage de body parser
const bodyParser = require('body-parser');

//Overide pour utiliser DELETE
const methodOverride = require('method-override');

//On previent express qu'il faut l'utiliser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//Overide pour utiliser DELETE et PUT depuis formulaire (_methode)
app.use(methodOverride('_method'));

//chiffrement du mot de passe
const bcrypt = require('bcrypt');
const saltRounds = 10;

//session express
const session = require('express-session');

app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method;
        delete req.body._method;
        return method
    }
}));

//express session
app.use(session({
    secret: 'kfgudrydrh',
    resave: true,
    saveUninitialized: true,
    // cookie: { maxAge: 60000 }
}));

/*
 Tout ce qui est dans le dossier fichiersStatiques sera accecible sur notre site depuis /puclic
 pour utiliser un fichier style.css dans le dossier css sur notre site il faudra dans notre template EJS
 <style href="/public/css/style.css" ...
 */
app.use("/public", express.static(process.cwd() + "/fichiersStatiques"));

//DECLARATION de l'utilisation de EJS
app.set("view engine", "ejs");

// middlewares pour admin
const regleUtilisateurs =require('./middlewares/regleUtilisateurs');
app.use(function (req, res, next) {
  regleUtilisateurs.ifLogin(req,res,next);
});

//#######################################
//### DECLARATION DES ROUTES
//#######################################
//Route Accueil
app.get('/', function (req, res) {
    res.render('hotel');
});

app.get('/listechambre', function (req, res) {
    connSql.query("SELECT * FROM chambre", function (err, resultat, meta) {
        if (err) throw err;
        // console.log(resultat);
        res.render('accueil', {resultat: resultat});
    });
});

// Route Formulaire enregistrement
app.get('/enregistrement', function (req, res) {
  if (!req.session.admin === true){
      res.send('ERROR404');
  }
    res.render('pageFormulaire');
});

//GROUPE ROUTE UTILISATEUR
app.get('/utilisateurs', function (req, res) {
    if (!req.session.admin === true){
        res.send('ERROR404')
    }
    connSql.query("SELECT * FROM utilisateurs", function (err, resultat, meta) {
        if (err) throw err;
        // console.log(resultat);
        res.render('pageUtilisateurs', {utilisateurs: resultat});
    });
});

//Route Formulaire enregistrement
app.post('/utilisateurs', function (req, res) {
    // console.log(req.body);
    //on récupere notre formulaire grace a req.body
    if (req.body.prenom === null || req.body.motDePass === null) {
        res.render('pageFormulaire');
    } else {
        let prenom = req.body.prenom;
        let motdepasse = req.body.motDePass;
        let hash = bcrypt.hashSync(motdepasse, saltRounds);
        //On prepare l'insertion avec les '?,?' que l'on remplace juste après avec [prenom,motdepasse]
        connSql.query("INSERT INTO utilisateurs (prenom, motdepasse) VALUES(?,?)", [prenom, hash], function (err, resultat, meta) {
            if (err) throw err;
            // console.log(resultat);
            res.redirect('/utilisateurs');
        });
    }
});

app.delete('/utilisateurs/:idUtilisateurs', function (req, res) {
    var idUtlisateurs = req.params.idUtilisateurs;

    connSql.query("DELETE FROM utilisateurs WHERE id  = ? ", [idUtlisateurs], function (err, resultat, meta) {
        if (err) throw err;
        // console.log(resultat);
        res.redirect('/utilisateurs');
    });
});

app.get('/utilisateurs/:idUtilisateurs', function (req, res) {
    var idUtlisateurs = req.params.idUtilisateurs;

    connSql.query("SELECT * FROM utilisateurs WHERE id = ? ", [idUtlisateurs], function (err, resultat, meta) {
        if (err) throw err;
        res.render('pageModifier', {resultat: resultat});
    });
});

app.put('/utilisateurs/:idUtilisateurs', function (req, res) {
    var idUtlisateurs = req.params.idUtilisateurs;
    var prenomUtilisateur = req.body.prenom;
    var motDeDasseUtilisateur = req.body.motDePass;
    let hash = bcrypt.hashSync(motDeDasseUtilisateur, saltRounds);

    connSql.query("UPDATE utilisateurs SET prenom = ? , motdepasse = ? WHERE id  = ? ", [prenomUtilisateur, hash, idUtlisateurs], function (err, resultat, meta) {
        if (err) throw err;
        // console.log(resultat);
        res.redirect('/utilisateurs');
    });
});

app.get('/connexion', function (req, res) {
    res.render('connexion');
});

app.post('/connexion', function (req, res) {
    if (req.body.prenom == null || req.body.motDePass == null) {
        res.redirect('/connexion');
    }
    var prenomUtilisateur = req.body.prenom;
    var motDePasseUtilisateur = req.body.motDePass;
    connSql.query("SELECT * FROM utilisateurs WHERE prenom = ? ", [prenomUtilisateur], function (err, resultat, meta) {
        if (err) throw err;
        if (resultat.length === 1) {
            bcrypt.compare(motDePasseUtilisateur, resultat[0].motdepasse, function(err, resCompare) {
                if (err) throw err;
               if (resCompare === true){
                   req.session.admin = true ;
                   console.log('connecte ok');
                   res.redirect('/utilisateurs');
               }else {
                   req.session.admin = false ;
                   console.log('connecte ko');
                   res.redirect('/connexion');
               }
            });
        }else {
            req.session.admin = false ;
            res.redirect('/connexion');
            console.log('connecte ko');
        }
    });
});

app.get('/deconnexion',function(req,res){
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        }	else {
            res.redirect('/');
        }
    })
});


app.get('/admin', (req,res) => {

    if (!req.session.admin === true){
        res.render('hotel')
    }

    connSql.query('SELECT * FROM chambre', function (err,result){
        if (err) throw err;
        res.render('chambres', {result:result});
    });

});

app.get('/admin/ajouter', (req,res) => {
    res.render('ajouterChambre');
});

app.get('/admin/:id', (req,res) => {
    connSql.query('SELECT * FROM chambre WHERE id = ?',[req.params.id],function (err,result) {
        res.render('modifierChambre',{result:result})
    });
});

app.post('/admin', (req, res) => {
    if (req.files) {
        let monFichier = req.files.fichier;
        let filename = monFichier.name;
        // Use the mv() method to place the file somewhere on your server
        monFichier.mv("./fichiersStatiques/images/upload/img_" + filename, function (err) {
            if (err) {
                return res.status(500).send(err);
            }
            let mesParametres = [req.body.fname,req.body.lname,req.body.email,filename,req.body.phone];
            let queryString = "INSERT INTO chambre (name,description,price,image,category) values(?,?,?,?,?)";
            connSql.query(queryString,mesParametres, function (err, res) {
                if (err) throw err;
            });
            res.redirect('/admin');
        })
    } else {
        res.send('Aucun fichier soumis');
    }
});

app.delete('/admin/:id', (req,res) => {

    let requetesupprdansadmin = "DELETE FROM chambre WHERE id=?;";
    connSql.query(requetesupprdansadmin,[req.params.id], function(err, res){
        if(err) throw err;

    });
    res.redirect('/admin');
});

app.put('/admin/:id', (req,res) => {

    let reqUpdate = " UPDATE chambre SET name = ? , description = ? , price = ? , image = ? , category = ? WHERE id = ?";

    connSql.query(reqUpdate,[req.body.fname,req.body.lname,req.body.email,req.body.fichier,req.body.phone,req.params.id],function(err,res){
        if(err) throw err;
    });
});

app.get('/admin/voir/:id', (req,res) => {
    connSql.query('SELECT * FROM chambre WHERE id = ?',[req.params.id],function (err,result) {
        res.render('voirChambres',{result:result})
    });
});

app.get('/reservation', function (req, res) {
    res.render('reservation');
});

app.post('/reservation', (req,res) => {
          let mesParametres = [req.body.datechoisi,req.body.nb_nuit,req.body.nb_personnes,req.body.type,req.body.nom,req.body.prenom,req.body.tel,req.body.adresse,req.body.comp_adresse,req.body.cp,req.body.ville,req.body.pays,req.body.chambres1,req.body.chambres2,req.body.chambres3,req.body.chambres4,req.body.chambres5,req.body.petitdej,req.body.balcon,req.body.vue,req.body.climatisation,req.body.msgcomplementaire];

          let requete ="INSERT INTO reservation (`datechoisi`, `nb_nuit`, `nb_personnes`, `type`, `nom`, `prenom`, `tel`, `adresse`, `comp_adresse`, `cp`, `ville`, `pays`, `single`, `twin`, `familial_triple_2_lits`, `familial_triple_3_lits`, `familial_quadruple`, `options_supplementaires`, `balcon`, `vue`, `climatisation`, `msgcomplementaire`) VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
          connSql.query(requete,mesParametres, function (err, res) {
              if (err) throw err;
          });
          res.redirect('/');
});

app.get('/tarif', function (req, res) {
    res.render('tarif');
});

app.get('/contact', function (req, res) {
    res.render('contact');
});

app.post('/contact', (req, res) => {
  let mesParametres =[req.body.civilite,req.body.nom,req.body.prenom,req.body.email,req.body.societe,req.body.adresse,req.body.cp,req.body.ville,req.body.tel,req.body.message]

  let queryString = "INSERT INTO contact (civilite, nom, prenom, email, societe, adresse, cp, ville, tel, message) VALUES (?,?,?,?,?,?,?,?,?,?)";
  connSql.query(queryString,mesParametres, function (err, res) {
      if (err) throw err;
  });
  res.redirect('/');
});

app.get('/noustrouver', function (req, res) {
    res.render('noustrouver');
});

app.listen(3000, function () {
    console.log("L'application est lancée et en écoute sur http://localhost:3000")
});
