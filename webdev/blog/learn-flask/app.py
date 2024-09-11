from flask import Flask, render_template, request
app=(Flask(__name__))

@app.route("/")
def index():
    name=request.args.get("name", "World")
    return render_template("index.html", name=name)

@app.route("/greet")
def greet():
    # name=request.args.get("name", "World")
    # return render_template("greet.html", name=name)
    return render_template("greet.html",name=request.args.get("name", "World")) 