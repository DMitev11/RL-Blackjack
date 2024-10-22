from flask import Flask
app = Flask(__name__)

from loaded_models.old_blackjack_routes import bp_blackjack_old
app.register_blueprint(bp_blackjack_old, url_prefix='/old')

from loaded_models.new_blackjack_routes import bp_blackjack_new
app.register_blueprint(bp_blackjack_new, url_prefix='/new')

app.run(port=8050)