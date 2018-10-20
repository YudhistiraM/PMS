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
    let role = req.body.role;
    let type = req.body.type;

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
          let sql1 = `SELECT userid FROM users ORDER BY users.userid DESC limit 1`;
          pool.query(sql1, (err, dataUser) => {
            let sql2 = `INSERT INTO jabatan (userid, role, type) VALUES (${dataUser.rows[0].userid}, '${role}', '${type}')`;
            pool.query(sql2, function(err) {
              console.log("sql2:", sql2);
              res.redirect('/');
            })
          })
        })
      }
    })
  });

  return router;
}
