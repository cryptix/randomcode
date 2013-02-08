<h1>Welcome to GoWiki</h1>

<h2>Create a New Page</h2>
<form action="/edit/">
	<div><label for="PageTitle">New Title: </label><input type="text" name="PageTitle"></div>
	<div><input type="submit" value="Create"></div>
</form>

<h2>View A Page</h2>
<ul>
{{range .}}
	<li><a href="/view/{{.}}">{{.}}</a></li>
{{end}}
</ul>