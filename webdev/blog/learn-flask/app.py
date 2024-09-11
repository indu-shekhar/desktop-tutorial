from flask import Flask, render_template, request
app=(Flask(__name__))

@app.route("/",methods=["GET","POST"])
def index():
    if request.method=="GET":
        return render_template("index.html")
    else:
        return render_template("greet.html", name=request.form.get("name", "World"))

# @app.route("/greet",methods=["POST"])
# def greet():
#     # name=request.args.get("name", "World")
#     # return render_template("greet.html", name=name)
#     return render_template("greet.html",name=request.form.get("name", "World")) 