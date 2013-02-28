/**
 * List functions to be exported from the design doc.
 */
 var templates = require('kanso/templates');


 exports.homepage = function (head, req) {

     start({code: 200, headers: {'Content-Type': 'text/html'}});

     // fetch all the rows
     var row, rows = [];
     while (row = getRow()) {
         rows.push(row);
     }

     // generate the markup for a list of blog posts
     var content = templates.render('blogposts.html', req, {
         rows: rows
     });

     if (req.client) {
         // being run client-side, update the current page
         $('#content').html(content);
         document.title = 'MyBlog';
     }
     else {
         // being run server-side, return a complete rendered page
         return templates.render('base.html', req, {
             content: content,
             title: 'Blag'
         });
     }

 };