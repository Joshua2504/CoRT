/*
 * Copyright (c) 2023 mascal
 *
 * CoRT is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CoRT is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with CoRT.  If not, see <http://www.gnu.org/licenses/>.
 */

/* Various common tools */


// id is the (x) thing at the end of each fortification
function humanise_events(events, has_id=true)  {
	events_html = "";
	realm_colors = get_realm_colors();
	for (let anevent of events) {
		let dt = new Date(anevent["date"] * 1000);
		let date_options = {
			month: 'numeric', day: 'numeric',
			hour: '2-digit', minute: '2-digit' };
		let datetime = dt.toLocaleDateString(undefined, date_options);
		let owner = anevent["owner"];
		let owner_color = realm_colors[owner];
		let captured = anevent["name"];
		events_html += `<b>${datetime}</b>&nbsp;`
		if (anevent["type"] == "fort" || anevent["type"] == "gem") {
			let location_color = realm_colors[anevent["location"]];
			if (anevent["type"] == "fort") {
				captured = translate_fort(captured, has_id);
				if (has_id === true)
					captured = captured.substring(0, captured.lastIndexOf(" "));
			}
			else if (anevent["type"] == "gem") {
				captured = _("Gem") + " #" + captured;
			}
			let target = `<span class="${location_color} bold">${captured}</span>`;
			let action;
			if (anevent["location"] == anevent["owner"]) {
				action = _("has recovered %s", target);
			}
			else {
				action = _("has captured %s", target);
			}
			events_html += `<span class="${owner_color} bold">${owner}</span> ${action}.`;
		}
		else if (anevent["type"] == "relic") {
			let location_color = realm_colors[anevent["owner"]];
			let relic = `<span class="${location_color} bold">${_("%s's relic", captured)}</span>`;
			if (anevent["location"] == "altar") {
				events_html += `${relic} ${_("is back to its altar.")}`;
			}
			else {
				events_html += `${relic} ${_("is in transit.")}`;
			}
		}
		else if (anevent["type"] == "wish") {
			let location_color = realm_colors[anevent["location"]];
			let sentence = _("%s made a dragon wish!", anevent["location"]);
			events_html += `<span class="${location_color} bold">${sentence}</span>`;
		}
		events_html += `<br>`;
	}
	return events_html;
}

// Create translatable strings according to english order of words
// id is the (x) thing at the end of each fortification,
function translate_fort(fort, has_id=true) {
	let words = fort.split(" ");
	let fort_id;
	let fort_name;
	let fort_type;
	if (has_id === true)
		fort_id = words.pop();
	if (words[1] == "Castle") {
		fort_name = words.shift();
		fort_type = "%s " + words.join(" ");
	}
	else {
		fort_name = words.pop();
		fort_type = words.join(" ") + " %s";
	}
	let translated = _(fort_type, fort_name)
	if (fort_id !== undefined)
		translated += ` ${fort_id}`;
	return translated;
}

function get_realm_colors() {
	return {"Alsius": "blue", "Ignis": "red", "Syrtis": "green"};
}

// Same order as the website
function get_realms() {
	return ["Alsius", "Ignis", "Syrtis"];
}