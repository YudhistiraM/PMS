var express = require('express');
var router = express.Router();
var moment = require('moment');
const fileUpload = require('express-fileupload');
var helpers = require('../helpers');
var util = require('../helpers/util');
const path = require('path');


module.exports = function(pool){

  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('login', {loginMessage: req.flash('loginMessage')});
  });

  router.post('/', function(req,res){
    let email = req.body.email;
    let pass = req.body.password;
    let sql = `SELECT COUNT(email) as count from users where email = '${email}' AND password ='${pass}'`;
    pool.query(sql, function(err,data){
      // console.log(data);
      let JmlhData = data.rows[0].count;
      if (err) {
        throw err;
      }
      if (JmlhData > 0) {
        req.session.email = email;
        res.redirect('/project');
      } else {
        req.flash('loginMessage', 'Masukkan Ussername & Password Dengan Benar');
        res.redirect('/');
      }
    })
  });

  router.get('/logout', function(req, res){
    req.session.destroy(function(err) {
      res.redirect('/');
    })
  });

  // Alert
  router.get('/alert', function(req, res, next) {
    res.render('alert');
  });


  // =====================================================================================================================================================================================================================================================//
  //projectpage
  // =====================================
  // ======================================================================================================================================================================================================================================================//


  router.get('/project', helpers, function(req, res, next) {
    let email = req.session.email;
    let url = req.url == '/project' ? '/project?page=1' : req.url;
    let currentPage = req.query.page || 1;
    let limit = 3;
    let offset = (currentPage - 1) * limit;


    let sql = `SELECT distinct projects.projectid FROM projects, members, users WHERE projects.projectid = members.projectid AND members.userid = users.userid`;
    let params = [];
    let searchingMode = false;
    if(req.query.cid && req.query.projectid && parseInt(req.query.projectid)){
      params.push(`projects.projectid = ${req.query.projectid}`)
      searchingMode = true;
    }
    if(req.query.cname && req.query.name){
      params.push(`name Ilike '${req.query.name}%'`)
      searchingMode = true;
    }
    if(req.query.cmember && req.query.member){
      params.push(`CONCAT(users.firstname, ' ', users.lastname) Ilike '%${req.query.member}%'`)
      searchingMode = true;
    }

    if(searchingMode){
      sql += ` and ${params.join(' and ')}`;
    }
    pool.query(sql, (err, data) => {
      let total = data.rows.length;
      let pages = Math.ceil(total / limit);

      let sql = `select distinct projects.* from projects, members, users WHERE projects.projectid = members.projectid AND members.userid = users.userid`;

      if(searchingMode){
        sql += ` and ${params.join(' and ')}`;
      }

      // console.log("Isi Data:", data);
      // add pagination on sql
      sql += ` order by projectid limit ${limit} offset ${offset}`;
      pool.query(sql, (errdata, tabledata) => {
        let subquery = tabledata.rows;
        // console.log("Subquery:", subquery);

        // console.log("Isi table data:", tabledata);
        // console.log(tabledata.rows);
        pool.query(`SELECT users.levelusers FROM users WHERE email = '${email}'`, (err, dataAdmin) => {
          // console.log("Data Admin:", dataAdmin.rows);
          pool.query(`SELECT CONCAT(firstname, ' ' , lastname) AS fullname, firstname FROM users`, (err, data1) => {
            pool.query(`SELECT COUNT(*) AS count from showtable where email = '${email}'`, (err, hitung) => {
              if(hitung.rows[0].count == 0){
                pool.query(`INSERT INTO showtable (email) VALUES ('${email}')`, (err) => {
                })
              }pool.query(`SELECT * FROM showtable WHERE email = '${email}'`,(err, data2) => {
                if(subquery.length > 0){
                  let sql1 = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS fullname, members.projectid FROM users, members WHERE members.userid = users.userid AND members.projectid IN (${subquery.map(function(a){return a.projectid;}).join(',')})`;
                  pool.query(sql1, (err, data) => {
                    // console.log("data:",sql1);
                    // console.log("members", data.rows);
                    if(err) throw err;
                    let datatabel = tabledata.rows.map(function(item){
                      // console.log(item);
                      item.members = data.rows.filter(function(x){
                        // console.log(x);
                        return x.projectid == item.projectid
                        // console.log(x.projectid);console.log(sql);
                      }).map(function(a){ return a.fullname })
                      //map harus 'mengembalikan nilai'
                      return item
                    })
                    // console.log("merge", datatabel);
                    // console.log("Data 2:", data2);
                    // console.log(data1);SELECT distinct users.userid, users.firstname, users.lastname, members.role FROM users, members WHERE members.userid = users.userid AND users.userid = 1
                    res.render('project', {
                      query: req.query,
                      data2: data2.rows,
                      data1: data1.rows,
                      dataAdmin: dataAdmin.rows,
                      tabeldata: datatabel,
                      pagination: {total, pages, currentPage, limit, offset, url: url}
                    });
                    // console.log(rows);});
                  })
                }else{
                  res.render('project', {
                    query: req.query,
                    data2: data2.rows,
                    data1: data1.rows,
                    dataAdmin: dataAdmin.rows,
                    tabeldata: [],
                    pagination: {total, pages, currentPage, limit, offset, url: url}
                  });
                }
              })
            })
          })
        })
      })
    })
  });

  router.get('/showtable', helpers, function(req, res){
    let email = req.session.email;
    let stable = [];

    req.query.sid ? stable.push('sid = true') : stable.push('sid = false')
    req.query.sname ? stable.push('sname = true') : stable.push('sname = false')
    req.query.smembers ? stable.push('smembers = true') : stable.push('smembers = false')

    pool.query(`UPDATE showtable SET ${stable.join(", ")} WHERE email = '${email}'`,(err) => {
      res.redirect('/project')
    })
  });

  // ===============================================================================================================================================================================================================//
  //profile
  // ==========================================//
  // ================================================================================================================================================================================================================//

  router.get('/profile', helpers, function(req, res, next) {
    let email = req.session.email;
    // SELECT password, role, type
    // FROM users, members
    // WHERE email = 'ma.yudhistira@gmail.com'
    let sql = `SELECT userid, email, password FROM users WHERE email = '${email}'`;
    pool.query(sql, (err, data) => {
      let sql1 = `SELECT userid, role, type FROM jabatan WHERE userid = ${data.rows[0].userid}`;
      pool.query(sql1, (err, dataMembers) => {
        console.log("Data:", data.rows);
        console.log("Data1:", dataMembers.rows);
        if(err) throw err;
        res.render('profile', {dataMembers:dataMembers.rows, data: data.rows, email: email});
      })
    })
  });

  router.post('/profile', helpers, function (req, res) {
    let email = req.session.email;
    let pass = req.body.password;
    let role = req.body.role;
    let type = req.body.type;

    let sql = `UPDATE users SET password = '${pass}' WHERE users.email = '${email}'`;
    pool.query(sql, (err) => {
      console.log("Update:", sql);
      let sql1 = `UPDATE jabatan SET role = '${role}', type= '${type}' WHERE jabatan.userid IN (SELECT userid FROM users WHERE email = '${email}')`;
      pool.query(sql1, (err) => {
        console.log("Update2:", sql1);
        res.redirect('/project')
      })
    })
  });

  // ===============================================================================================================================================================================================================//
  //Add ProjectAdd Page
  // ==========================================//
  // ================================================================================================================================================================================================================//

  router.get('/addproject', helpers, function(req, res, next) {
    let sql = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users`;
    pool.query(sql, (err, data) => {
      // console.log(data);
      if(err) throw err;
      res.render('addproject', {data: data.rows});
    })
  });

  router.post('/addproject', helpers, function (req, res) {
    let name = req.body.nameproject;
    let member = req.body.memberproject;

    let sql = `INSERT INTO projects (name) VALUES ('${name}')`;
    pool.query(sql, (err) => {
      // console.log(sql);
      pool.query(`SELECT projectid From projects ORDER BY projectid DESC limit 1`, (err, proid) => {
        // console.log(data.rows);
        // console.log("data member:", proid);
        for (let i = 0; i < member.length; i++) {
          let sql2 = `INSERT INTO members (userid, projectid) VALUES (${member[i]}, ${proid.rows[0].projectid})`;
          pool.query(sql2, (err) => {
            // console.log(sql2);
            if (i == member.length - 1){
              res.redirect('/project')
            }
          })
        }
      })
    })
  });

  // ===============================================================================================================================================================================================================//
  //Get Fungsi Delete
  // ==========================================//
  // ================================================================================================================================================================================================================//

  router.get('/delete/:projectid', function(req, res) {
    let P_id = req.params.projectid;
    let sql = `DELETE FROM members WHERE projectid = ${P_id}`;
    pool.query(sql, function (err){
      pool.query(`DELETE FROM projects WHERE projectid = ${P_id}`, function (err){
        if (err) throw err;
        res.redirect('/project');
      })
    })
  });

  // ===============================================================================================================================================================================================================//
  //Edit
  // ==========================================//
  // ================================================================================================================================================================================================================//

  router.get('/editProject/:id', helpers, function(req, res, next) {
    let id = req.params.id;
    let sql = `SELECT members.userid, members.projectid, projects.name, projects.projectid FROM members, projects WHERE projects.projectid = ${id} AND members.projectid = ${id} `;
    pool.query(sql, (err, data) => {
      let sql2 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users`;
      pool.query(sql2, (err, data1) => {
        if(err) throw err;
        // console.log("tes");
        // console.log(req.query);
        // console.log("tes");
        res.render('editproject',{util: util, data: data.rows, data1: data1.rows});
      })
    })
  });

  router.post('/editProject/:id', helpers, function(req, res, next) {
    let id = req.params.id;
    let name = req.body.name;
    let member = req.body.memberproject;
    pool.query(`UPDATE projects SET name = '${name}' WHERE projectid = ${id}`, (err) => {
      if (err) throw err;
      pool.query(`DELETE FROM members WHERE projectid = ${id}`, (err) => {
        if (err) throw err;
        for(let i = 0; i < member.length; i++){
          // console.log("Member",sql);
          let sql = `INSERT INTO members (userid, projectid) VALUES (${member[i]}, ${id})`;
          pool.query(sql, (err) => {
            // console.log(sql);
            if(i == member.length -1){
              res.redirect('/project');
            }
          })
        }
      })
    })
  });


  // ===============================================================================================================================================================================================================//
  //Project Overview
  // ==========================================//
  // ================================================================================================================================================================================================================//

  router.get('/project_overview/:projectid',helpers, function(req, res, next) {
    let id = req.params.projectid;
    // console.log("ProjectID Overview:", id);


    let sql = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS fullname FROM users, members WHERE members.userid = users.userid AND projectid = ${id}`;
    pool.query(sql, (err, dataMembers) => {
      let sql1 =`SELECT count (issues.tracker) as total FROM issues WHERE projectid = ${id} AND tracker = 'Bug'`;
      pool.query(sql1, (err, dataBug) => {
        let sql1A = `SELECT count (issues.status) as total FROM issues WHERE projectid = ${id} AND tracker = 'Bug' AND (issues.status = 'New' OR issues.status = 'In Progress' OR issues.status = 'Feedback')`;
        pool.query(sql1A, (err, dataBug1) => {

          let sql2 = `SELECT count (issues.tracker) as total FROM issues WHERE projectid = ${id} AND tracker = 'Feature'`;
          pool.query(sql2, (err, dataFeature) => {
            let sql2A = `SELECT count (issues.status) as total FROM issues WHERE projectid = ${id} AND tracker = 'Feature' AND (issues.status = 'New' OR issues.status = 'In Progress' OR issues.status = 'Feedback')`;
            pool.query(sql2A, (err, dataFeature1) => {

              let sql3 = `SELECT count (issues.tracker) as total FROM issues WHERE projectid = ${id} AND tracker = 'Support'`;
              pool.query(sql3, (err, dataSupport) => {
                let sql3A = `SELECT count (issues.status) as total FROM issues WHERE projectid = ${id} AND tracker = 'Support' AND (issues.status = 'New' OR issues.status = 'In Progress' OR issues.status = 'Feedback')`;
                pool.query(sql3A, (err, dataSupport1) => {
                  // console.log("dataMembers:", dataMembers);
                  // console.log("Data Members:", dataMembers);
                  res.render('project_overview',
                  {
                    dataMembers: dataMembers.rows,
                    projectid: id,
                    dataBug: dataBug.rows,
                    dataBug1:dataBug1.rows,
                    dataFeature: dataFeature.rows,
                    dataFeature1: dataFeature1.rows,
                    dataSupport: dataSupport.rows,
                    dataSupport1: dataSupport1.rows
                  });
                })
              })
            })
          })
        })
      })
    })
  });

  // ===============================================================================================================================================================================================================//
  //project_members
  // ==========================================//
  // ================================================================================================================================================================================================================//

  router.get('/project_members/:projectid', helpers, function(req, res, next){
    let email = req.session.email;
    let projectId = req.params.projectid;

    let sql1 = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS fullname, users.userid, members.role, members.projectid FROM users, members WHERE members.userid = users.userid AND projectid = ${projectId}`;
    let params = [];
    let searchingMode = false;
    // console.log("IF:", req.query.id);

    if (req.query.cid && req.query.id && parseInt(req.query.id)) {
      params.push(`users.userid = ${req.query.id}`)
      searchingMode = true;
    }

    if (req.query.cname && req.query.name){
      params.push(`CONCAT(users.firstname, ' ', users.lastname) Ilike '%${req.query.name}%'`)
      searchingMode = true;
    }

    if (req.query.cmember && req.query.member){
      params.push(`role = '${req.query.member}'`)
      searchingMode = true;
    }

    if (searchingMode) {
      sql1 += ` AND ${params.join(' AND ')}`;
    }

    sql1 += ` ORDER BY userid ASC`;

    pool.query(sql1, (err, dataMembers) => {
      // console.log("Data Member:", sql1);
      // console.log("Data params:", params);

      let sql2 = `SELECT distinct members.role FROM members`;
      pool.query(sql2, (err, choseePossition) =>{
        let sql3 = `SELECT COUNT(*) AS count from showmembers where email = '${email}'`;
        pool.query(sql3, (err, hitung) => {
          let total = hitung.rows[0].count;
          // console.log("Data Hitung:", total);
          if(total == 0){
            pool.query(`INSERT INTO showmembers (email) VALUES ('${email}')`, (err) => {
            })
          }
          pool.query(`SELECT * FROM showmembers WHERE email = '${email}'`,(err, datashowMembers) => {

            res.render('project_members', {
              query: req.query,
              dataMembers : dataMembers.rows,
              choseePossition : choseePossition.rows,
              showmembers : datashowMembers.rows,
              projectId: projectId
            });
            // console.log("Data Members:", dataMembers);
          })
        })
      })
    })
  });

  // ==========================================================================================================
  // showtableMembers
  // ==========================================================================================================


  router.get('/showmembers/:projectId', helpers, function(req, res){
    let email = req.session.email;
    let projectid = req.params.projectId;
    let stable = [];

    req.query.smid ? stable.push('smid = true') : stable.push('smid = false')
    req.query.smname ? stable.push('smname = true') : stable.push('smname = false')
    req.query.smposition ? stable.push('smposition = true') : stable.push('smposition = false')

    pool.query(`UPDATE showMembers SET ${stable.join(", ")} WHERE email = '${email}'`,(err) => {
      res.redirect(`/project_members/${projectid}`)
    })
  });


  // ================================================================================================================
  // EDIT MEMBERS
  // ================================================================================================================


  router.get('/edit_Members/:projectid/:usersid', helpers, function(req, res, next) {
    let userid = req.params.usersid;
    let projectid = req.params.projectid;

    let sql =`SELECT distinct users.userid, users.firstname, users.lastname, members.role FROM users, members WHERE members.userid = users.userid AND users.userid = ${userid}`;
    pool.query(sql, (err, dataUsers) => {
      // console.log("Data Users:", dataUsers);
      res.render('edit_Members',{dataUsers: dataUsers.rows, userid: userid, projectid: projectid});
    })
  });

  router.post('/edit_Members/:projectid/:usersid', helpers, function(req, res, next) {
    let userid = req.params.usersid;
    let projectid = req.params.projectid;

    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let role = req.body.role;

    let sql = `UPDATE users SET firstname = '${firstName}', lastname = '${lastName}' WHERE userid = ${userid}`;
    pool.query(sql, (err) => {
      // console.log("sql1:", sql);
      let sql2 = `UPDATE members SET role = '${role}' WHERE members.projectid = ${projectid} AND members.userid = ${userid}`;
      // console.log("sql2:", sql2);
      pool.query(sql2, (err) => {
        res.redirect(`/project_members/${projectid}`)
      })
    })
  });

  // =========================================================================================================================
  // DELETE MEMBER
  // =========================================================================================================================


  router.get('/delete/:projectid/:usersid', function(req, res) {
    let projectid = req.params.projectid;
    let userid = req.params.usersid;

    // console.log("Data:", projectid);
    // console.log("Data:", userid);

    let sql = `DELETE FROM members WHERE projectid = ${projectid} AND userid = ${userid}`;
    pool.query(sql, function (err){
      res.redirect(`/project_members/${projectid}`);
    })
  });

  // =========================================================================================================
  // Add Members Project
  // =========================================================================================================


  router.get('/add_MemberProject/:projectId', helpers, function(req, res, next) {
    let projectid = req.params.projectId;

    let sql = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users ORDER BY userid ASC`;
    pool.query(sql, (err, dataUsers) => {
      // console.log("Data Users:", dataUsers);
      if(err) throw err;
      res.render('add_MemberProject', {dataUsers: dataUsers.rows, projectid: projectid});
    })
  });

  router.post('/add_MemberProject/:projectId', helpers, function (req, res) {
    let projectid = req.params.projectId;
    let member = req.body.member;
    let role = req.body.role;

    let sql = `INSERT INTO members (userid, role, projectid) VALUES (${member}, '${role}', ${projectid})`;
    pool.query(sql, (err) => {
      res.redirect(`/project_members/${projectid}`);
    })
  });

  // =======================================================================================================================================
  // PROJECT ISSUES
  // =======================================================================================================================================

  router.get('/project_issues/:projectid', helpers, function(req, res, next) {
    let email = req.session.email;
    let projectid = req.params.projectid;
    let url = req.url == `/project_issues/${projectid}` ? `/project_issues/${projectid}?page=1` : req.url;
    let currentPage = req.query.page || 1;
    let limit = 3;
    let offset = (currentPage - 1) * limit;


    let sql = `SELECT count(*) as total FROM issues WHERE projectid = ${projectid}`;
    let params = [];
    let searchingMode = false;

    if (req.query.isid && req.query.issueid){
      params.push(`issues.issueid Ilike '%${req.query.issueid}%'`)
      searchingMode = true;
    }

    if (req.query.subname && req.query.subject){
      params.push(`issues.subject Ilike '%${req.query.subject}%'`)
      searchingMode = true;
    }

    if (req.query.ctracker && req.query.tracker){
      params.push(`issues.tracker = '${req.query.tracker}'`)
      searchingMode = true;
    }

    if (searchingMode) {
      sql += ` AND ${params.join(' AND ')}`
    }

    pool.query(sql, (err, data) => {
      let total = data.rows[0].total;
      let pages = Math.ceil(total / limit);
      // console.log(pages);
      // console.log("Total:", total);
      // console.log("Pages:", pages);

      let sql1 = `SELECT issues.issueid, issues.subject, issues.tracker, issues.priority FROM issues WHERE projectid = ${projectid}`;

      if (searchingMode) {
        sql1 += ` AND ${params.join(' AND ')}`
      }

      sql1 += ` order by projectid limit ${limit} offset ${offset}`;

      pool.query(sql1, (err, dataissues) => {

        let sql2 = `SELECT distinct issues.tracker FROM issues`;
        pool.query(sql2, (err, trackers) => {
          let sql3 = `SELECT COUNT(*) AS count from showissues where email = '${email}'`;
          pool.query(sql3, (err, hitung) => {
            let total = hitung.rows[0].count;
            if(total == 0){
              pool.query(`INSERT INTO showissues (email) VALUES ('${email}')`, (err) => {
              })
            }
            pool.query(`SELECT * FROM showissues WHERE email = '${email}'`,(err, datashowIssues) => {
              // console.log("Track:", trackers.rows);
              // console.log(dataissues);
              res.render('project_issues',
              {
                query: req.query,
                trackers: trackers.rows,
                projectid: projectid,
                dataissues: dataissues.rows,
                showissues: datashowIssues.rows,
                pagination: {total, pages, currentPage, limit, offset, url: url}

              });
            })
          })
        })
      })
    })
  });

  // =======================================================================================================================================
  // Add Issues
  // =======================================================================================================================================


  router.get('/add_ProjectIssues/:projectid', helpers, function(req, res, next) {
    let projectid = req.params.projectid;
    let email = req.session.email;

    let sql = `SELECT projects.projectid, projects.name FROM projects`;
    pool.query(sql, (err, dataProjects) => {
      let sql2 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users ORDER BY userid ASC`;
      pool.query(sql2, (err, dataAsignee) => {
        let sql3 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users WHERE email = '${email}' `;
        pool.query(sql3, (err, dataAuthor) => {
          let sql4 = `SELECT issueid FROM issues WHERE projectid = ${projectid}`;
          pool.query(sql4, (err, dataissueid) => {
            let sql5 = `SELECT * FROM projects WHERE projectid = ${projectid}`;
            pool.query(sql5, (err, dataprojects) => {
              // console.log("Data Projects:", dataprojects);
              res.render('add_ProjectIssues', {
                projectid: projectid,
                dataAsignee: dataAsignee.rows,
                dataProjects: dataProjects.rows,
                dataAuthor: dataAuthor.rows,
                dataissueid: dataissueid.rows,
                dataprojects : dataprojects.rows
              });

            })

          })
        })
      })
    })
  });

  router.post('/add_ProjectIssues/:projectid', helpers, function (req, res) {
    let projectid = req.params.projectid;
    let issue = req.body.issueid;


    // let projects = req.body.projects;
    let tracker = req.body.tracker;
    let subject = req.body.subject;
    let description = req.body.description;
    let status = req.body.status;
    let priority = req.body.priority;
    let asignee = req.body.asignee;
    let startdate = req.body.Sdate;
    let duedate = req.body.Ddate;
    let estimateddate = req.body.Edate;
    let progress = req.body.progress;
    let file = req.body.file;
    let spenttime = req.body.Stime;
    let Tversion = req.body.Tversion;
    let author = req.body.author;
    let createdate = req.body.Cdate;
    let updatedate = req.body.Udate;
    let closeddate = req.body.Cddate;
    let parenttask = req.body.Ptask;

    //uploadfile
    let fileIssues = req.files.doc;
    let filename = `${issue}`+fileIssues.name;

    let date = new Date();
    let logdate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;

    fileIssues.mv(path.join(__dirname, '../public/upload/') + filename, function(err) {
      if (err)
      return res.status(500).send(err);
    })

    let sql = `INSERT INTO issues (issueid, projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, spenttime, targetversion, author, crateddate, updateddate, closeddate, parenttask) VALUES ('${issue}', ${projectid}, '${tracker}', '${subject}', '${description}', '${status}', '${priority}', ${asignee}, '${startdate}', '${duedate}', '${estimateddate}', ${progress}, '${filename}', ${spenttime}, '${Tversion}', ${author}, '${createdate}', '${updatedate}', '${closeddate}', '${parenttask}')`;
    pool.query(sql, (err) => {
      // console.log("Data SQL:", sql);


      pool.query(`SELECT CONCAT(firstname, ' ' , lastname) AS fullname FROM users WHERE email = '${req.session.email}'`, (err, fir) => {
        let note = `${date.getHours()}:${date.getMinutes()} ${subject} #${issue} (${status}): Add issues, author: ${fir.rows[0].fullname}`;
        let sql1 = `INSERT INTO activitylog (projectid,logdate, note) VALUES (${projectid}, '${logdate}', '${note}')`;
        pool.query(sql1, (err) => {
          // console.log("Data SQL 1:", sql1);
          // console.log("sql:", sql);
          res.redirect(`/project_issues/${projectid}`);
        })
      })
    })
  });

  // ===========================================================================================
  // DETAIL ISSUE
  // ===========================================================================================


  router.get('/detail_Projectissues/:projectid/:issueid', helpers, function(req, res, next) {
    let issueid = req.params.issueid;
    let projectid = req.params.projectid;

    let sql =`SELECT issues.issueid, issues.projectid, issues.tracker, issues.subject, issues.description, issues.status, issues.priority, issues.assignee, issues.startdate, issues.duedate, issues.estimatedtime, issues.done, issues.files, issues.spenttime, issues.targetversion, issues.author, issues.crateddate, issues.updateddate, issues.closeddate, issues.parenttask FROM issues WHERE projectid = ${projectid} AND issueid = '${issueid}'`;
    pool.query(sql, (err, dataissues) => {
      let data_fillter = dataissues.rows;
      // console.log("dataasignee:", data_assignee);
      let jmlhassignee = data_fillter[0].assignee;
      // console.log("dataAssignee:", jmlhassignee);
      let jmlhauthor = data_fillter[0].author;
      // console.log("dataAuthor:", jmlhauthor);
      let sql2 =`SELECT * FROM projects WHERE projectid = ${projectid}`;
      pool.query(sql2, (err, dataproject) => {
        let sql3 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname FROM users WHERE userid = ${jmlhassignee}`;
        pool.query(sql3, (err, dataAssignee) => {
          let sql4 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname FROM users WHERE userid = ${jmlhauthor}`;
          pool.query(sql4, (err, dataAuthor) => {
            // console.log("Data Assignee:", sql4);
            // console.log("Data Assignee:", dataAuthor);
            res.render('detail_Projectissues',{dataAuthor: dataAuthor.rows, dataAssignee: dataAssignee.rows, dataissues: dataissues.rows, dataproject: dataproject.rows, issueid: issueid, projectid: projectid, moment: moment});
          })
        })
      })
    })
  });

  // =================================================================================================
  // EDIT Project ISSUE
  //==================================================================================================

  router.get('/edit_ProjectIssues/:projectid/edit/:issueid', helpers, function(req, res, next) {
    let issueid = req.params.issueid;
    let projectid = req.params.projectid;
    let email = req.session.email;

    let sql =`SELECT issues.issueid, issues.projectid, issues.tracker, issues.subject, issues.description, issues.status, issues.priority, issues.assignee, issues.startdate, issues.duedate, issues.estimatedtime, issues.done, issues.files, issues.spenttime, issues.targetversion, issues.author, issues.crateddate, issues.updateddate, issues.closeddate, issues.parenttask FROM issues WHERE projectid = ${projectid} AND issueid = '${issueid}'`;
    pool.query(sql, (err, dataissues) => {
      let data_fillter = dataissues.rows;
      // console.log("dataasignee:", data_fillter);
      let jmlhassignee = data_fillter[0].assignee;
      // console.log("dataAssignee:", jmlhassignee);
      let jmlhauthor = data_fillter[0].author;
      // console.log("dataAuthor:", jmlhauthor);
      let sql1 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users WHERE userid = ${jmlhassignee}`;
      pool.query(sql1, (err, jmlAssignee) => {
        let sql2 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users WHERE userid = ${jmlhauthor}`;
        pool.query(sql2, (err, jmlAuthor) => {
          let sql3 =`SELECT * FROM projects WHERE projectid = ${projectid}`;
          pool.query(sql3, (err, dataproject) => {
            let sql4 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users ORDER BY userid ASC`;
            pool.query(sql4, (err, dataAsignee) => {
              let sql5 = `SELECT distinct issues.issueid FROM issues WHERE projectid = ${projectid}`;
              pool.query(sql5, (err, dataissue) => {
                let sql6 = `SELECT CONCAT(firstname, ' ' , lastname) AS fullname, userid FROM users WHERE email = '${email}' `;
                pool.query(sql6, (err, dataAuthor) => {
                  // console.log("DATA ISSUE:", dataissue.rows);
                  // console.log("Data Users:", dataissues);
                  res.render('edit_ProjectIssues',
                  {
                    dataAsignee: dataAsignee.rows,
                    jmlAssignee: jmlAssignee.rows,
                    jmlAuthor: jmlAuthor.rows,
                    dataissues: dataissues.rows,
                    dataproject: dataproject.rows,
                    dataissue: dataissue.rows,
                    dataAuthor: dataAuthor.rows,
                    issueid: issueid,
                    projectid: projectid,
                    moment: moment
                  });
                })
              })
            })
          })
        })
      })
    })
  });

  router.post('/edit_ProjectIssues/:projectid/edit/:issueid', helpers, function(req, res, next) {
    let projectid = req.params.projectid;
    let issueid = req.params.issueid;

    let tracker = req.body.tracker;
    let subject = req.body.subject;
    let description = req.body.description;
    let status = req.body.status;
    let priority = req.body.priority;
    let assignee = req.body.assignee;
    let startdate = req.body.Sdate;
    let duedate = req.body.Ddate;
    let estimatedtime = req.body.Edate;
    let done = req.body.progress;
    let file = req.body.file;
    let spenttime = req.body.spenttime;
    let Tversion = req.body.Tversion;
    let author = req.body.author;
    let createddate = req.body.Cdate;
    let updatedate = req.body.Udate;
    let closeddate = req.body.Cldate;
    let parenttask = req.body.Ptask;

    let date = new Date();
    let logdate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;


    let sql = `UPDATE issues SET tracker = '${tracker}', subject = '${subject}', description = '${description}', status = '${status}', priority = '${priority}', assignee = ${assignee}, startdate = '${startdate}', duedate = '${duedate}', estimatedtime = '${estimatedtime}', done = ${done}, files = '${file}', spenttime = ${spenttime}, targetversion = '${Tversion}', author = ${author}, crateddate = '${createddate}', updateddate = '${updatedate}', closeddate = '${closeddate}', parenttask = '${parenttask}' WHERE projectid = ${projectid} AND issueid = '${issueid}'`;
    pool.query(sql, (err) => {
      pool.query(`SELECT issueid FROM issues WHERE issueid = '${issueid}'`, (err, iid) => {
        // console.log("Data iid:", iid.rows);
        pool.query(`SELECT CONCAT(firstname, ' ' , lastname) AS fullname FROM users WHERE email = '${req.session.email}'`, (err, fir) => {
          let note = `${date.getHours()}:${date.getMinutes()} ${subject} #${iid.rows[0].issueid} (${status}): Edit issues, author: ${fir.rows[0].fullname}`;
          let sql1 = `INSERT INTO activitylog (projectid,logdate, note) VALUES (${projectid}, '${logdate}', '${note}')`;
          pool.query(sql1, (err) => {

            res.redirect(`/project_issues/${projectid}`)
          })
        })
      })
    })
  });

  // ========================================================================================================
  // DELETE ISSUED
  // ========================================================================================================

  router.get('/delete_issue/:projectid/:issueid', function(req, res) {
    let projectid = req.params.projectid;
    let issueid = req.params.issueid;

    let date = new Date();
    let logdate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;

    // console.log("projectid:", projectid);
    // console.log("Issueid:", issueid);
    pool.query(`SELECT * FROM issues WHERE issueid = '${issueid}'`, (err, iid) => {
      // console.log("Data iid:", iid.rows);
      pool.query(`SELECT CONCAT(firstname, ' ' , lastname) AS fullname FROM users WHERE email = '${req.session.email}'`, (err, fir) => {
        let note = `${date.getHours()}:${date.getMinutes()} ${iid.rows[0].subject} #${iid.rows[0].issueid} (${iid.rows[0].status}): Delete issues, author: ${fir.rows[0].fullname}`;
        let sql1 = `INSERT INTO activitylog (projectid,logdate, note) VALUES (${projectid}, '${logdate}', '${note}')`;
        pool.query(sql1, (err) => {
          let sql = `DELETE FROM issues WHERE parenttask = '${issueid}'`;
          pool.query(sql, function (err){
            let sql = `DELETE FROM issues WHERE issueid = '${issueid}'`;
            pool.query(sql, function (err){
              res.redirect(`/project_issues/${projectid}`);
            })
          })
        })
      })
    })
  });

  // =======================================================================================================
  // sowIssues
  // =======================================================================================================

  router.get('/showIssues/:projectid', helpers, function(req, res){
    let email = req.session.email;
    let projectid = req.params.projectid;
    let stable = [];

    req.query.siid ? stable.push('siid = true') : stable.push('siid = false')
    req.query.sisubject ? stable.push('sisubject = true') : stable.push('sisubject = false')
    req.query.sitracker ? stable.push('sitracker = true') : stable.push('sitracker = false')
    req.query.sipriority ? stable.push('sipriority = true') : stable.push('sipriority = false')

    pool.query(`UPDATE showissues SET ${stable.join(", ")} WHERE email = '${email}'`,(err) => {
      res.redirect(`/project_issues/${projectid}`)
    })
  });

  // =============================================================================
  // Show Activity
  //==============================================================================

  router.get('/project_activity/:projectid', helpers, function(req, res, next) {
    let projectid = req.params.projectid;
    let getDay = util.formatDays();
    let getDate = util.formatDates();
    let arr = [];

    // console.log("getDay:", getDay);
    // console.log("getDate:", getDate);

    pool.query(`SELECT note FROM activitylog WHERE projectid = ${projectid} AND logdate = '${getDate[0]}'`, (err,dataActive) => {
      // console.log("DataActive:", sql);
      if(err) throw err;
      if(dataActive.rows.length > 0) arr.push({day: `Today - ${getDay[0]}, ${getDate[0]}`, dataActive: dataActive.rows});
      pool.query(`SELECT note FROM activitylog WHERE logdate = '${getDate[1]}' AND projectid = ${projectid}`, (err, dataActive) => {
        if(dataActive.rows.length > 0) arr.push({day: `Yesterday - ${getDay[1]}, ${getDate[1]}`, dataActive: dataActive.rows});
        pool.query(`SELECT note FROM activitylog WHERE logdate = '${getDate[2]}' AND projectid = ${projectid}`, (err, dataActive) => {
          if(dataActive.rows.length > 0) arr.push({day: `${getDay[2]}, ${getDate[2]}`, dataActive: dataActive.rows});
          pool.query(`SELECT note FROM activitylog WHERE logdate = '${getDate[3]}' AND projectid = ${projectid}`, (err, dataActive) => {
            if(dataActive.rows.length > 0) arr.push({day: `${getDay[3]}, ${getDate[3]}`, dataActive: dataActive.rows});
            pool.query(`SELECT note FROM activitylog WHERE logdate = '${getDate[4]}' AND projectid = ${projectid}`, (err, dataActive) => {
              if(dataActive.rows.length > 0) arr.push({day: `${getDay[4]}, ${getDate[4]}`, dataActive: dataActive.rows});
              pool.query(`SELECT note FROM activitylog WHERE logdate = '${getDate[5]}' AND projectid = ${projectid}`, (err, dataActive) => {
                if(dataActive.rows.length > 0) arr.push({day: `${getDay[5]}, ${getDate[5]}`, dataActive: dataActive.rows});
                pool.query(`SELECT note FROM activitylog WHERE logdate = '${getDate[6]}' AND projectid = ${projectid}`, (err, dataActive) => {
                  if(dataActive.rows.length > 0) arr.push({day: `${getDay[6]}, ${getDate[6]}`, dataActive: dataActive.rows});

                  res.render('project_activity',{ projectid: projectid, arr: arr, dateNow: getDate[0], dateBefore: getDate[6] });

                })
              })
            })
          })
        })
      })
    })
  });



  return router;
}
