router.post('/upload/:projectid', function(req, res) {
  let projectid = req.params.projectid;
  var fileName = req.body.doc;

  if (!req.files)
  return res.status(400).send('No files were uploaded.');

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let fileIssues = req.files.doc;
  console.log("File:", fileIssues);
  // console.log("FileName:", fileName);

  // Use the mv() method to place the file somewhere on your server
  fileIssues.mv("../Upload" + fileName, function(err) {
    if (err)
    return res.status(500).send(err);

    res.send('File uploaded!');
  });
});




// PENAMPUNGAN TES CODE/// -- Not Use
