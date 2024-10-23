from flask import Flask
app = Flask(__name__)

from routes.single_handed_blackjack_routes import bp_blackjack_singlehanded
app.register_blueprint(bp_blackjack_singlehanded, url_prefix='/single_handed')

from routes.multi_handed_blackjack_routes import bp_blackjack_new
app.register_blueprint(bp_blackjack_new, url_prefix='/multihand')

app.run(port=8050)