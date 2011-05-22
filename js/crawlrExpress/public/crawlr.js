// helper
var humansize = (function() {
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    return function(size) {
        var i = 0;
        while (size >= 1024) {
            size /= 1024;
            ++i;
        }
        return size.toFixed(1) + ' ' + units[i];
    };
} ());

// UI elements

function FileRow(name, stat) {
    var tr = $('<tr></tr>');

    tr.append($('<td></td>').text(name));
    tr.append($('<td></td>').text(humansize(stat.size)));
    tr.append($('<td></td>').text(stat.mtime));


    tr.click(function() {
        $('#files > table').hide('slow');
        $.post('files/getFile',
        {
            'fname': name
        },
        function(obj) {
            var file;
            if (obj.b64 !== undefined) {
                file = $('<img>');

                file.attr('src', 'data:' + obj.mime + ';base64,' + obj.b64);
                file.css({
                    width: '750px'
                });
            } else if (typeof obj.str === 'string') {
                file = $('<pre></pre>');

                file.text(obj.str);
            } else {
                file = $('<p>Error</p>');
                var ul = $('<ul></ul>');

                ul.append('<li>' + obj.path + '</li>');
                ul.append('<li>' + obj.mime + '</li>');

                file.append(ul);
            }

            file.click(function() {
                $(this).remove();
                $('#files > table').show('fast');
            });

            $('#files').append(file);
        },
        'json');
    });

    return tr;
}

function TreeElem(name) {
    var li = $('<li></li>').text(name);

    li.click(function() {
        $('#cwd > li').remove();
        $('#tree > ul > li').remove();
        $('#tree > ul').append(TreeElem('..'));
        $('#files > table > tbody > tr').remove();
        $.post('files/lsDir',
        {
            'newd': name
        },
        function(data) {
            var d, f;
            
            data.c.split('/').forEach(function(e) {
                $('#cwd').append($('<li></li>').text(e));
            });

            for (d in data.d) {
                if (data.d.hasOwnProperty(d)) {
                    $('#tree > ul').append(TreeElem(d));
                }
            }

            for (f in data.f) {
                if (data.f.hasOwnProperty(f)) {
                    $('#files > table > tbody').append(FileRow(f, data.f[f]));
                }
            }

        },
        'json');
    });

    return li;
}

$(document).ready(function() {

    $('.error').hide('slow');
    $('.success').hide('slow');

    
    setTimeout(function() {
        $('#tree > ul').append(TreeElem('..'));
        TreeElem('.').click();
    }, 1000)
});

