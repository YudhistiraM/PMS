var express = require('express');
var router = express.Router();

module.exports = function(pool){

router.get('/signup', function(req, res, next) {
  res.render('signup');
});


router.post('/signup', function(req, res, next){
  let firstName = req.body.firstname;
  let lastName = req.body.lastname;
  let email = req.body.email;
  let pass = req.body.password;
  let sql = `select count(*) as count from users where email ILIKE '${email}%'`;
  pool.query(sql, function(err, data) {
    let JmlhData = data.rows[0].count;
    // console.log(JmlhData);
    if (err) {
      throw err;
    }
    if (JmlhData > 0) {
      res.redirect('/alert');
    } else {
      let sql = `INSERT INTO users (firstname, lastname, email, password) VALUES ('${firstName}', '${lastName}', '${email}', '${pass}')`;
      pool.query(sql, function(err) {
        if (err) {
          throw err;
        }
      })
      res.redirect('/');
    }
  })
});

return router;
}
