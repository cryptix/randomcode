<h1>Editing {{.Title}}</h1>

<form action="/save/{{.Title}}" method="POST">
	<div>
		<textarea name="body" cols="80" rows="20">{{printf "%s" .Body}}</textarea>
	</div>
	<div>
		<input type="submit" value="Save">
	</div>
</form>

<a href="/">Back to Index</a>