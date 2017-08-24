module.exports = {
   ifLogin: function (req, res, next) {
       if (req.session.admin == null) {
           res.locals.connecte = false;
       } else {
           res.locals.connecte = req.session.admin;
       }
       next();
   },};
