/*
 * Copyright (c) 2022-2023 mascal
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

const minlevel = 10;
const maxlevel = 60;
const class_type_masks = {
	'archer':0x10, 'hunter':0x11, 'marksman':0x12,
	'mage':0x20, 'conjurer':0x21, 'warlock':0x22,
	'warrior':0x40, 'barbarian':0x41, 'knight':0x42
};

var trainerdata = null;
var trainerdataversion = null;

const mindlevel = 1;
const maxdlevel = 19;
const minplevel = 0;
const maxplevel = 5;
var currlevel = 0;
var currclass = null;
var wmrow = 0;
var powerpoints = 0;
// XXX beware it's just a buffer that is unexploitable once the setup is loaded
var saved_setup;

$(document).ready(function() {
	// generate characters levels options
	for (let i = maxlevel - 1; i >= minlevel; i--) {
		$("#t-level").append(`<option value="${i}">${i}</option>`);
	}
	// generate datasets version
	$("#t-version").append(`<option value="${trainerdatasets[0]}" default selected>
		${_("Current game version")} (${trainerdatasets[0]})</option>`);
	for (let i = 1; i < trainerdatasets.length; i++) {
		$("#t-version").append(`<option value="${trainerdatasets[i]}">${trainerdatasets[i]}</option>`);
	}
	// search for a given trainer dataset in url, and skillset then
	// set the version accordingly. See also manage_dataset_versions.
	let urlsearch = new URLSearchParams(window.location.search);
	let skillset = urlsearch.get("s");
	trainerdataversion = urlsearch.get("d");
	if (skillset) {
		load_setup_from_url(skillset);
		// Hide setup options while loading
		$(".setup").hide();
	}
});

$("#t-load").on("click", function() {
	let level = $("#t-level").val();
	let clas = $("#t-class").val();
	if ( (level >= minlevel && level <= maxlevel) ) {
		currlevel = level;
	}
	else {
		alert(_("Please select a level"));
		return;
	}
	if (clas != null) {
		currclass = clas;
	}
	else {
		alert(_("Please select a class"));
		return;
	}
	trainerdataversion = $("#t-version").val();
	manage_dataset_versions();
	load_tree();
});

$("#t-level").on('change', function() {
	let selectedllevel = $("#t-level").val();
	// Upgrade does not work if no trees are loaded, you are level 60
	// or if the requested level is lower than your current level
	if (currlevel == 0 || currlevel == maxlevel || currlevel > selectedllevel)
		return;
	currlevel = selectedllevel;
	window.location.assign(save_setup_to_url(false));
});

$("#t-save").on("click", function() {
	if (trainerdata === null) {
		window.alert(_(`You need first to load trees by clicking on "%s"!`, _("Load / Reset")));
		return;
	}
	let saved_url = save_setup_to_url();
	$("#t-dialog-url").val(saved_url);
	$("#t-dialog").attr("inert", "true");
	document.getElementById("t-dialog").showModal();
	$("#t-dialog").removeAttr("inert");
	$("body").css("filter", "blur(10px)");

});

document.addEventListener('keyup', function(e) {
    if (e.keyCode == 27) {
	    document.getElementById("t-dialog").close();
	    window.location.href = $("#t-dialog-url").val();
    }
});

$("#t-dialog-close").on("click", function() {
	window.location.href = $("#t-dialog-url").val();
});


$("#t-dialog-copy").on("click", function() {
	navigator.clipboard.writeText($("#t-dialog-url").val())
		.then(() => {
			$("#t-dialog-copy").text(_("Link copied!"));
			let timer = setInterval(() => {
				$("#t-dialog-copy").text(_("Copy link"));
				clearInterval(timer);
				}, 3000);
		})
		.catch((error) => {
			console.error("Failed to copy text: ", error);
			$("#t-dialog-copy").text("Copy failed!");
		});
});

function manage_dataset_versions() {
	// valid dataset ?
	if (!trainerdatasets.includes(trainerdataversion)) {
		// invalid dataset supplied
		trainerdataversion = trainerdatasets[0];
	}
	// display a warning if an old version of the datasets are used, and
	// remove it if the latest dataset is loaded after.
	$("#oldversion").remove();
	if (trainerdataversion != trainerdatasets[0]) {
		$("#t-points").append(`	<div id="oldversion">
					<p class="red"><b>
					${_("This setup is being made with an older version (%s) of CoR, and may be out of date.",
					trainerdataversion)}<p>
					<p><a href="javascript:upgrade_setup_to_new_version()">${_("Click here")}</a>
					${_("to upgrade this setup's discipline and power points to the latest version (%s).",
					trainerdatasets[0])}</p>
					</div>
					`);
	}
}

async function collect_setup(setupstring) {
	if (window.location.origin != "https://mascaldotfr.github.io")
		return;
	try {
		await $().post("https://hail.thebus.top/cortdata/submit.php", {"setup":setupstring});
	}
	catch (error) {
		console.error(`Failed to send setup: ${error}`);
	}
}

function upgrade_setup_to_new_version() {
	trainerdataversion = trainerdatasets[0];
	window.location.assign(save_setup_to_url(false));
}

function save_setup_to_url(shared = true) {
	let setup = "";
	setup = setup.concat(currclass + "+");
	setup = setup.concat(currlevel + "+");
	// WM row is always the latest one
	for (let row = 1; row <= wmrow; row++) {
		// separate discipline skills from power skills
		setup = setup.concat(parseInt($(`#t-trainer .t${row} .p0 .icon .skilllvl`).text())) + "+";
		for (let col = 1; col < 11; col++) {
			setup = setup.concat(parseInt($(`#t-trainer .t${row} .p${col} .icon .skilllvl`).text()) || 0);
		}
		if (row != wmrow) {
			setup = setup.concat("+");
		}
	}
	if (shared == true)
		collect_setup(`${trainerdataversion}+${setup}`);
	return window.location.origin + window.location.pathname +
	       "?d=" + trainerdataversion + "&s=" +
		LZString.compressToEncodedURIComponent(setup);
}

// load_tree() being async, you need the tree to be loaded
// in order to click stuff so this is before loading the tree ...
function load_setup_from_url(skillset) {
	saved_setup = LZString.decompressFromEncodedURIComponent(skillset);
	if (saved_setup == null) {
		window.alert(_("Your shared link is bad. Bailing out, sorry!"));
		return;
	}
	saved_setup = saved_setup.split("+");
	$("#t-class").val(saved_setup.shift());
	$("#t-level").val(saved_setup.shift());
	manage_dataset_versions();
	$("#t-version").val(trainerdataversion);
	$("#t-load").trigger("click");
}

// ... and this is after (called by load_tree())
function input_setup_from_url() {
	if (saved_setup === undefined)
		return;
	let row = 0;
	for (let item = 0; item < saved_setup.length; item++) {
		if (item % 2 == 0) {
			// discipline points
			row++;
			do_clicks = (saved_setup[item] - 1) / 2 ;
			for (let i = 0; i < do_clicks; i++) {
				$(`#t-trainer .t${row} .p0 .skillspinner .plus`).trigger("click");
			}
		}
		else {
			// power points
			let powers = saved_setup[item].split("");
			if (row == wmrow)
				continue; // no pp for the wm row
			for (let power in powers) {
				power = parseInt(power);
				for (let i = 0; i < powers[power]; i++) {
					$(`div[treepos="${row}"] .p${power + 1} .skillspinner .plus`).trigger("click");
				}
			}
		}
	}
	saved_setup = undefined;
}

function icon_factory(spellpos, iconsrc, treepos, spellname, treename) {
	// discipline points are always > 1, but skill points must be 0 to simplify code later.
	let skilllvl = spellpos == 0 ? 1 : 0;
	let icon = ` 	<div class="p${spellpos}">
				<div class="icon" style="background-image:url(${iconsrc});"
				title="${spellname}" treename="${treename}" iconurl="${iconsrc}" spellpos="${spellpos}">
		`;
	// WM tree; don't show skill points
	if (treepos != wmrow || (treepos == wmrow && spellpos == 0)) {
		icon = icon.concat(` <span class="skilllvl">${skilllvl}</span>`);
	}
	icon = icon.concat(`</div>`);
	// WM tree has no skill points
	if (treepos != wmrow || (treepos == wmrow && spellpos == 0 && currlevel == 60)) {
		icon = icon.concat(`
				<div class="skillspinner">
					<button class="plus">+</button><button class="minus">-</button>
				</div>`);
	}
	icon = icon.concat(`</div>`);
	return icon;
}

async function load_tree() {
	// Hide setup options while loading
	$(".setup").hide();
	let base_skills = class_type_masks[currclass] & 0xF0;
	let class_skills = class_type_masks[currclass];
	// adjust code to get base power and discipline points, as well as WM tree location.
	// needed because mages have 8 trees unlike 7 for warriors and archers
	if ((class_type_masks[currclass] & 0xF0) == 32) {
		wmrow = 8;
		powerpoints = 32;
	}
	else {
		wmrow = 7;
		powerpoints = 80;
	}
	$("#t-trainer").empty();
	$("#skillinfo").empty();
	try {
		trainerdata = await $().getJSON("data/" + trainerdataversion + "/trainerdata.json");
	}
	catch (error) {
		// Should never happen as the data is local...
		alert(`Unable to fetch trainer data: ${error}`);
		$(".setup").show();
		return;
	}
	let alltrees = trainerdata.class_disciplines[base_skills];
	alltrees = alltrees.concat(trainerdata.class_disciplines[class_skills]);
	let trainerhtml = "";
	let treepos = 0;
	alltrees.forEach( (tree) => {
		treepos++;
		let spellpos = 0;
		let iconsrc = "data/" + trainerdataversion + "/icons/" + tree.replace(/ /g, "") + ".jpg";
		trainerhtml = trainerhtml.concat(`<div treepos="${treepos}" class="t${treepos}">`);
		trainerhtml = trainerhtml.concat(icon_factory(spellpos, iconsrc, treepos, tree, ""));
		trainerdata.disciplines[tree].spells.forEach( (spell) => {
			spellpos++;
			if (treepos == wmrow && spellpos % 2 == 1) {
				// WM tree; don't display empty skills, put a placeholder instead.
				trainerhtml = trainerhtml.concat(`<div class="p${spellpos}"><div class="icon"></div></div>`);
			}
			else {
				let spellname = spell.name;
				trainerhtml = trainerhtml.concat(icon_factory(spellpos, iconsrc, treepos, spellname, tree));
			}
		});
		trainerhtml = trainerhtml.concat(`</div>`);
	});
	$("#t-trainer").append(trainerhtml);

	$("#t-dpointsleft").text(trainerdata.points.discipline[powerpoints][currlevel - 1]);
	$("#t-dpointstotal").text(trainerdata.points.discipline[powerpoints][currlevel - 1]);
	$("#t-ppointsleft").text(trainerdata.points.power[powerpoints][currlevel - 1]);
	$("#t-ppointstotal").text(trainerdata.points.power[powerpoints][currlevel - 1]);
	$(".points").show();

	for (let i = 1; i <= wmrow; i++) { update_tree(i); }

	// need to add this trigger **once** the trainer UI is generated
	$(".plus, .minus").on("click", function() {
		if (this.parentNode.parentNode.className == "p0") {
			discipline_change(this);
		}
		else {
			power_change(this);
		}
	});
	$(".icon").on("click", function() {
		if (this.parentNode.className != "p0") {
			display_spell(this);
		}
	});
	input_setup_from_url();
	$(".setup").show();
}

function tablify(rowname, columns, color = "") {
	if (typeof columns == "string" || typeof columns == "boolean" || typeof columns == "number") {
		if (columns.length == 0 || columns == true) {
			columns = "yes"
		}
		return `<tr><th class="${color}">${rowname}</th><td colspan=5>${columns}</td></tr>`;
	}
	else {
		let htmlcolumns = "";
		columns.forEach( (column) => htmlcolumns = htmlcolumns.concat(`<td>${column}</td>`) );
		return `<tr><th class="${color}">${rowname}</th>${htmlcolumns}</tr>`;
	}

}

function display_spell(spellinfo) {
	let spellname = spellinfo.getAttribute("title");
	let treename = spellinfo.getAttribute("treename");
	let iconclass = spellinfo.getAttribute("class");
	let iconurl = spellinfo.getAttribute("iconurl");
	// icon position in spelltree
	let iconposition = spellinfo.getAttribute("spellpos");
	spellinfo = trainerdata.disciplines[treename].spells.filter(element => element.name == spellname)[0];
	// don't duplicate css, redraw an icon
	let spellhtml = `
		<div class="p${iconposition} descriptionheader">
			<div class="${iconclass}" style="background-image:url(${iconurl});"></div>
			<div>
				<h2>${spellinfo.name}</h2>
				<p class="description"><i>${spellinfo.description}</i></p>
			</div>
		</div>
		<p><b>Type:</b> ${spellinfo.type}</p>`;
	let tabularhtml = ""
	if ("cast" in spellinfo)
		spellhtml = spellhtml.concat(`<p><b>Cast:</b> ${spellinfo.cast.toString()}s</p>`);
	if ("gcd" in spellinfo)
		spellhtml = spellhtml.concat(`<p><b>Global Cooldown:</b> ${spellinfo.gcd.toString()}</p>`);
	if ("range" in spellinfo)
		spellhtml = spellhtml.concat(`<p><b>Range:</b> ${spellinfo.range.toString()}</p>`);
	if ("area" in spellinfo)
		spellhtml = spellhtml.concat(`<p><b>Area:</b> ${spellinfo.area.toString()}</p>`);
	if ("cooldown" in spellinfo)
		spellhtml = spellhtml.concat(`<p><b>Cooldown:</b> ${spellinfo.cooldown.toString()}s</p>`);
	if ("weapon_interval" in spellinfo)
		spellhtml = spellhtml.concat(`<p class="purple"><b>Affected by weapon interval</b></p>`);
	if ("blockable_100" in spellinfo)
		spellhtml = spellhtml.concat(`<p class="purple"><b>Only blockable at 100%</b></p>`);
	if ("resistible_100" in spellinfo)
		spellhtml = spellhtml.concat(`<p class="purple"><b>Only resistible at 100%</b></p>`);
	if ("mana" in spellinfo)
		tabularhtml = tabularhtml.concat(tablify("Mana", spellinfo.mana));
	if ("duration" in spellinfo)
		tabularhtml = tabularhtml.concat(tablify("Duration (s)", spellinfo.duration));
	if ("damage" in spellinfo) {
		for (let type in spellinfo.damage) {
			tabularhtml = tabularhtml.concat(tablify(`${type} damage`, spellinfo.damage[type], "red"));
		}
	}
	if ("debuffs" in spellinfo) {
		for (let type in spellinfo.debuffs) {
			tabularhtml = tabularhtml.concat(tablify(`${type}`, spellinfo.debuffs[type], "red"));
		}
	}
	if ("buffs" in spellinfo) {
		for (let type in spellinfo.buffs) {
			tabularhtml = tabularhtml.concat(tablify(`${type}`, spellinfo.buffs[type], "blue"));
		}
	}
	if (tabularhtml.length != 0) {
		let theader = `<div style="overflow-x:auto;"><table><thead><tr>
			   <th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
			  </tr></thead>`;
		let tfooter = "</table></div>";
		spellhtml = theader + spellhtml + tabularhtml + tfooter;
	}
	$("#skillinfo").html(spellhtml);
}


function power_change(power) {
	let change_direction = power.className;
	let skill_level_html = power.parentNode.parentNode.getElementsByClassName("skilllvl")[0];
	let skill_level = parseInt($(skill_level_html).text());
	let discipline_level = parseInt($(power.parentNode.parentNode.parentNode.getElementsByClassName("skilllvl")[0]).text());
	let wanted_level = change_direction == "plus" ? skill_level + 1 : skill_level - 1;
	let maxslvl = trainerdata.required.power[discipline_level];
	if (wanted_level > maxplevel || wanted_level < minplevel) {
		console.log("bad power level", wanted_level);
		return;
	}
	let ppointsleft = parseInt($("#t-ppointsleft").text());
	if (ppointsleft < wanted_level - skill_level) {
		console.log("not enough power points");
		return;
	}
	if (wanted_level > maxslvl) {
		console.log("not enough discipline points");
		return;
	}
	// valid, change it
	$("#t-ppointsleft").text(ppointsleft += change_direction == "plus" ? -1 : 1);
	$(skill_level_html).text(wanted_level);
	$(power.parentNode.parentNode.childNodes[1]).css('filter', wanted_level == 0 ? 'brightness(.25)' : 'brightness(1)');
}

function discipline_change(discipline) {
	let change_direction = discipline.className;
	let discipline_level = discipline.parentNode.parentNode.getElementsByClassName("skilllvl")[0];
	let current_level = parseInt($(discipline_level).text());
	let wanted_level = change_direction == "plus" ? current_level + 2 : current_level - 2;
	if (wanted_level > maxdlevel || wanted_level < mindlevel) {
		console.log("bad discipline level", wanted_level);
		return;
	}
	if (trainerdata.required.level[wanted_level- 1] > currlevel) {
		console.log("player level is too low");
		return;
	}
	// check if we have enough discipline points left
	let discipline_points_balance = change_direction == "plus" ?
		0 - ( trainerdata.required.points[wanted_level - 1] -  trainerdata.required.points[current_level - 1] ) :
		trainerdata.required.points[current_level - 1] - trainerdata.required.points[wanted_level - 1];
	let current_discipline_points = parseInt($("#t-dpointsleft").text());
	if (	change_direction == "plus" &&
		current_discipline_points + discipline_points_balance < 0 ) {
		console.log("not enough discipline points");
		return;
	}
	// valid, do the change
	$("#t-dpointsleft").text(current_discipline_points + discipline_points_balance);
	$(discipline_level).text(wanted_level);
	let treepos = discipline.parentNode.parentNode.parentNode.getAttribute("treepos");
	// deal with the possible skills changes
	update_tree(treepos);
}

function update_tree(treepos) {
	let dpointsleft = parseInt($("#t-dpointsleft").text());
	let dpointstotal = parseInt($("#t-dpointstotal").text());
	let ppointsleft = parseInt($("#t-ppointsleft").text());
	let ppointstotal = parseInt($("#t-ppointstotal").text());
	let dlvl = parseInt($(`div[treepos="${treepos}"] .p0 .icon .skilllvl`).text());
	let maxslvl = trainerdata.required.power[dlvl];

	// XXX maybe there are better selector options to get all values for a
	// tree but ...
	for (let i = 1; i <= 10; i++) {
		let sel_icon = $(`div[treepos="${treepos}"] .p${i} .icon`);
		if (treepos != wmrow) {
			var sel_plus = $(`div[treepos="${treepos}"] .p${i} .skillspinner .plus`);
			var sel_minus = $(`div[treepos="${treepos}"] .p${i} .skillspinner .minus`);
		}
		// if tree has been lowered and the skill is no more available,
		// make it visually disabled
		if (i > trainerdata.required.available[dlvl - 1]) {
			maxslvl = 0;
		}
		// reduce powerpoints when discipline level is lowered
		if (treepos != wmrow) {
			let skilllvl = parseInt($(`div[treepos="${treepos}"] .p${i} .icon .skilllvl`).text());
			if (skilllvl > maxslvl) {
				// change to the max power level available
				$(`div[treepos="${treepos}"] .p${i} .icon .skilllvl`).text(maxslvl);
				// update available power points
				ppointsleft = ppointsleft + skilllvl - maxslvl;
				$("#t-ppointsleft").text(ppointsleft);
			}
		}
		if ( 	(currlevel > trainerdata.required.level[dlvl - 1] && i != 1) ||
			(currlevel != maxlevel && treepos == wmrow) ) {
			// reduce strongly brightness and disable buttons on
			// unavailable skills due to player or discpline tree
			// level. also forbid WM tree for non level 60.
			sel_icon.css('filter','grayscale(1) brightness(.5)');
			if (treepos != wmrow) {
				sel_plus.hide();
				sel_minus.hide();
			}
		}
		// if discipline tree level allows the skill to be interacted
		// with, reenable the skill
		if ( i <= trainerdata.required.available[dlvl - 1] ) {
			if (treepos == wmrow) {
				// WM tree requires no skills points, just make
				// it fully visible
				sel_icon.css('filter','brightness(1)');
			}
			else {
				sel_icon.css('filter','brightness(.25)');
				sel_plus.show();
				sel_minus.show();
			}
		}
		// ensure brightness is kept when a tree level is decreasing in
		// the beginning of that loop
		if (treepos != wmrow && $(`div[treepos="${treepos}"] .p${i} .icon .skilllvl`).text() > 0) {
			sel_icon.css('filter','brightness(1)');
		}
	}
	return;
}
