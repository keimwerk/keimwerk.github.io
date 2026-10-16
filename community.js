(function(){
'use strict';
var SITE_URL='https://keimwerk.github.io/community.html';
var cfg=window.KEIMWERK_SUPABASE_CONFIG||{};
var $=function(id){return document.getElementById(id);};
var setupNotice=$('setup-notice');
var key=String(cfg.publishableKey||'').trim();
if(!cfg.url||!key||/PASTE_YOUR_SUPABASE|YOUR_SUPABASE|PLACEHOLDER/i.test(key)||!window.supabase||typeof window.supabase.createClient!=='function'){
  setupNotice.hidden=false;
  setupNotice.textContent='Die Community-Verbindung ist noch nicht fertig konfiguriert. In community-config.js muss der öffentliche Supabase Publishable Key eingetragen werden. Bis dahin bleiben Registrierung und Beiträge deaktiviert.';
  setupNotice.classList.add('error');
  document.querySelectorAll('form button, .tabs button, #refresh-feed').forEach(function(el){el.disabled=true;});
  return;
}
var client=window.supabase.createClient(cfg.url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
var session=null,canPost=false,isAdmin=false,loadingFeed=false;
function el(tag,className,text){var n=document.createElement(tag);if(className)n.className=className;if(text!==undefined&&text!==null)n.textContent=String(text);return n;}
function setStatus(id,text,isError){var n=$(id);if(!n)return;n.textContent=text||'';n.classList.toggle('error',!!isError);}
function formatDate(value){if(!value)return 'Unbekanntes Datum';var date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'});}
function friendlyError(error){
  var message=String(error&&error.message||error||'Unbekannter Fehler');
  if(/community_profiles_username_ci_uq|community_profiles_username_format_check|duplicate key|unique constraint/i.test(message))return 'Dieser Benutzername ist bereits vergeben oder entspricht nicht den erlaubten Regeln. Wähle einen anderen Namen (3–24 Zeichen, nur Buchstaben, Zahlen und Unterstriche).';
  if(/Invalid login credentials/i.test(message))return 'E-Mail oder Passwort stimmen nicht. Prüfe auch, ob du deine E-Mail-Adresse bestätigt hast.';
  if(/Email not confirmed/i.test(message))return 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Nachricht.';
  if(/community_can_post|row-level security|permission denied/i.test(message))return 'Die Datenbank hat diese Aktion aus Sicherheitsgründen abgelehnt. Prüfe den Kontostatus oder die Einrichtung.';
  return message;
}
function setAuthMode(mode){$('login-form').hidden=mode!=='login';$('signup-form').hidden=mode!=='signup';$('show-login').setAttribute('aria-selected',String(mode==='login'));$('show-signup').setAttribute('aria-selected',String(mode==='signup'));setStatus('auth-status','');}
$('show-login').addEventListener('click',function(){setAuthMode('login');});
$('show-signup').addEventListener('click',function(){setAuthMode('signup');});
$('signup-form').addEventListener('submit',async function(event){
  event.preventDefault();var form=event.currentTarget,username=form.elements.username.value.trim(),email=form.elements.email.value.trim(),password=form.elements.password.value;
  if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){setStatus('auth-status','Der Benutzername muss 3–24 Zeichen lang sein und darf nur Buchstaben, Zahlen und Unterstriche enthalten.',true);return;}
  if(password.length<8){setStatus('auth-status','Bitte verwende ein Passwort mit mindestens 8 Zeichen.',true);return;}
  var submit=form.querySelector('button[type="submit"]');submit.disabled=true;setStatus('auth-status','Registrierung wird vorbereitet …');
  try{
    var result=await client.auth.signUp({email:email,password:password,options:{data:{username:username},emailRedirectTo:SITE_URL}});
    if(result.error)throw result.error;
    if(result.data&&result.data.user&&Array.isArray(result.data.user.identities)&&result.data.user.identities.length===0)throw new Error('Für diese E-Mail-Adresse existiert möglicherweise bereits ein Konto.');
    form.reset();setAuthMode('login');
    setStatus('auth-status','Registrierungsanfrage wurde gesendet. Bestätige deine E-Mail-Adresse über den Link in der Nachricht und melde dich danach hier an. Kommt keine Nachricht an, muss zuerst der E-Mail-Versand in Supabase eingerichtet werden.');
  }catch(error){setStatus('auth-status',friendlyError(error),true);}finally{submit.disabled=false;}
});
$('login-form').addEventListener('submit',async function(event){
  event.preventDefault();var form=event.currentTarget,submit=form.querySelector('button[type="submit"]');submit.disabled=true;setStatus('auth-status','Anmeldung läuft …');
  try{var result=await client.auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});if(result.error)throw result.error;form.elements.password.value='';setStatus('auth-status','Du bist angemeldet.');}
  catch(error){setStatus('auth-status',friendlyError(error),true);}finally{submit.disabled=false;}
});
$('forgot-password').addEventListener('click',async function(){
  var email=$('login-email').value.trim();if(!email){setStatus('auth-status','Trage zuerst deine E-Mail-Adresse ein.',true);return;}
  try{var result=await client.auth.resetPasswordForEmail(email,{redirectTo:SITE_URL});if(result.error)throw result.error;setStatus('auth-status','Falls für diese Adresse ein Konto besteht, wurde eine Anleitung zum Zurücksetzen angefordert. Der E-Mail-Versand muss korrekt eingerichtet sein.');}
  catch(error){setStatus('auth-status',friendlyError(error),true);}
});
$('password-recovery-form').addEventListener('submit',async function(event){
  event.preventDefault();var password=$('recovery-password').value;if(password.length<8){setStatus('recovery-status','Mindestens 8 Zeichen verwenden.',true);return;}
  try{var result=await client.auth.updateUser({password:password});if(result.error)throw result.error;$('password-recovery-form').reset();$('password-recovery-panel').hidden=true;setStatus('auth-status','Das Passwort wurde aktualisiert.');}
  catch(error){setStatus('recovery-status',friendlyError(error),true);}
});
$('signout-button').addEventListener('click',async function(){var result=await client.auth.signOut();if(result.error)setStatus('account-status',friendlyError(result.error),true);else setStatus('auth-status','Du wurdest abgemeldet.');});
async function checkPermissions(){
  canPost=false;isAdmin=false;if(!session){renderPermissionState();return;}
  var results=await Promise.all([client.rpc('community_can_post'),client.rpc('community_is_admin')]);
  canPost=!results[0].error&&results[0].data===true;isAdmin=!results[1].error&&results[1].data===true;renderPermissionState();
}
function renderPermissionState(){
  $('auth-shell').hidden=!!session;$('account-panel').hidden=!session;
  $('user-greeting').textContent=session?'Angemeldet als '+String(session.user.user_metadata&&session.user.user_metadata.username||'Community-Nutzer'):'';
  $('post-question-panel').hidden=!session||!canPost;$('post-locked').hidden=!session||canPost;$('admin-panel').hidden=!session||!isAdmin;
  if(session&&!canPost)setStatus('account-status','Dein Konto darf momentan keine Beiträge veröffentlichen. Das kann an einer Moderationssperre oder einer noch nicht abgeschlossenen Einrichtung liegen.',true);
  else if(session)setStatus('account-status','Deine E-Mail-Adresse und interne Konto-ID werden anderen Community-Nutzern nicht angezeigt.');
}
function reportButton(type,id){
  if(!session)return null;var button=el('button','btn small-btn','Beitrag melden');button.type='button';
  button.addEventListener('click',async function(){
    var reason=window.prompt('Warum möchtest du diesen Beitrag melden? Bitte nenne einen konkreten Grund.');if(reason===null)return;reason=reason.trim();
    if(reason.length<3||reason.length>1000){window.alert('Bitte einen Grund mit 3–1000 Zeichen eingeben.');return;}
    var row={reporter_id:session.user.id,reason:reason};if(type==='question')row.question_id=id;else row.answer_id=id;
    var result=await client.from('community_reports').insert(row);
    if(result.error)window.alert(friendlyError(result.error));else window.alert('Danke. Deine Meldung wurde zur Prüfung eingereicht.');
  });return button;
}
function renderQuestion(question,answers){
  var article=el('article','question-card');article.appendChild(el('h3','question-title',question.title));
  var meta=el('div','meta');meta.appendChild(el('span','',question.username||'Gelöschter Nutzer'));meta.appendChild(el('span','','· '+formatDate(question.created_at)));meta.appendChild(el('span','badge',question.category||'Allgemein'));article.appendChild(meta);
  article.appendChild(el('p','question-body',question.body));
  var topActions=el('div','post-actions');var questionReport=reportButton('question',question.id);if(questionReport)topActions.appendChild(questionReport);if(topActions.childNodes.length)article.appendChild(topActions);
  var answerBlock=el('div','answers');answerBlock.appendChild(el('h3','','Antworten ('+answers.length+')'));
  if(!answers.length)answerBlock.appendChild(el('p','muted','Noch keine Antworten. Sei die erste Person, die antwortet.'));
  answers.forEach(function(answer){
    var answerCard=el('div','answer'),answerHead=el('div','answer-head');answerHead.appendChild(el('span','',answer.username||'Gelöschter Nutzer'));answerHead.appendChild(el('time','',formatDate(answer.created_at)));answerCard.appendChild(answerHead);answerCard.appendChild(el('p','answer-body',answer.body));
    var actions=el('div','answer-actions'),answerReport=reportButton('answer',answer.id);if(answerReport)actions.appendChild(answerReport);if(actions.childNodes.length)answerCard.appendChild(actions);answerBlock.appendChild(answerCard);
  });
  if(session&&canPost){
    var form=el('form','answer-form'),label=el('label','','Deine Antwort'),textarea=el('textarea');textarea.name='body';textarea.maxLength=10000;textarea.required=true;textarea.placeholder='Hilfreiche Antwort schreiben …';label.appendChild(textarea);form.appendChild(label);
    var submit=el('button','primary','Antwort veröffentlichen');submit.type='submit';form.appendChild(submit);var note=el('div','status');form.appendChild(note);
    form.addEventListener('submit',async function(event){
      event.preventDefault();submit.disabled=true;note.textContent='Antwort wird veröffentlicht …';
      try{var result=await client.from('community_answers').insert({question_id:question.id,user_id:session.user.id,body:textarea.value.trim()});if(result.error)throw result.error;textarea.value='';note.textContent='Antwort veröffentlicht.';await loadFeed();}
      catch(error){note.textContent=friendlyError(error);note.classList.add('error');}finally{submit.disabled=false;}
    });answerBlock.appendChild(form);
  }else if(!session)answerBlock.appendChild(el('p','muted','Melde dich an, um zu antworten.'));
  article.appendChild(answerBlock);return article;
}
async function loadFeed(){
  if(loadingFeed)return;loadingFeed=true;var list=$('question-list');list.replaceChildren();setStatus('feed-status','Fragen werden geladen …');
  try{
    var results=await Promise.all([
      client.from('community_questions_public').select('*').order('created_at',{ascending:false}).limit(100),
      client.from('community_answers_public').select('*').order('created_at',{ascending:true}).limit(1000)
    ]);
    if(results[0].error)throw results[0].error;if(results[1].error)throw results[1].error;
    var questions=results[0].data||[],answers=results[1].data||[],answerMap=new Map();
    answers.forEach(function(a){if(!answerMap.has(a.question_id))answerMap.set(a.question_id,[]);answerMap.get(a.question_id).push(a);});
    if(!questions.length)list.appendChild(el('div','empty','Noch keine Fragen vorhanden. Registriere dich und stelle die erste Frage.'));
    questions.forEach(function(question){list.appendChild(renderQuestion(question,answerMap.get(question.id)||[]));});
    setStatus('feed-status',questions.length+' Fragen geladen. Öffentliche Namen sind frei gewählte Benutzernamen; E-Mail-Adressen werden nicht angezeigt.');
  }catch(error){setStatus('feed-status','Die Fragen konnten nicht geladen werden: '+friendlyError(error),true);list.appendChild(el('div','empty','Prüfe die Supabase-Konfiguration und die Leserechte der öffentlichen Ansichten.'));}
  finally{loadingFeed=false;}
}
$('refresh-feed').addEventListener('click',function(){loadFeed();});
$('question-form').addEventListener('submit',async function(event){
  event.preventDefault();if(!session){setStatus('question-status','Bitte melde dich zuerst an.',true);return;}if(!canPost){setStatus('question-status','Dein Konto darf momentan keine Beiträge veröffentlichen.',true);return;}
  var form=event.currentTarget,submit=form.querySelector('button[type="submit"]'),title=form.elements.title.value.trim(),body=form.elements.body.value.trim(),category=form.elements.category.value;
  if(title.length<5||body.length<10){setStatus('question-status','Der Titel braucht mindestens 5, der Text mindestens 10 Zeichen.',true);return;}
  submit.disabled=true;setStatus('question-status','Frage wird veröffentlicht …');
  try{var result=await client.from('community_questions').insert({user_id:session.user.id,title:title,body:body,category:category});if(result.error)throw result.error;form.reset();setStatus('question-status','Deine Frage wurde veröffentlicht.');await loadFeed();}
  catch(error){setStatus('question-status',friendlyError(error),true);}finally{submit.disabled=false;}
});
function appendAdminText(parent,tag,className,text){var n=el(tag,className,text);parent.appendChild(n);return n;}
function actionButton(parent,label,callback,className){var b=el('button','btn small-btn '+(className||''),label);b.type='button';b.addEventListener('click',callback);parent.appendChild(b);return b;}
async function moderateUser(user,action){
  var reason=window.prompt('Begründung für diese Moderationsmaßnahme (3–1000 Zeichen):');if(reason===null)return;reason=reason.trim();
  if(reason.length<3||reason.length>1000){window.alert('Bitte eine Begründung mit 3–1000 Zeichen eingeben.');return;}
  var expires=null;if(action==='temporary_ban')expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
  var result=await client.rpc('community_moderate_user',{p_target_user_id:user.user_id,p_action:action,p_reason:reason,p_expires_at:expires});
  if(result.error)window.alert(friendlyError(result.error));else{setStatus('admin-status','Nutzermaßnahme gespeichert.');await loadAdmin();await loadFeed();}
}
async function moderateContent(type,id,action){
  var reason=window.prompt('Begründung für die Beitragsmaßnahme (3–1000 Zeichen):');if(reason===null)return;reason=reason.trim();
  if(reason.length<3||reason.length>1000){window.alert('Bitte eine Begründung mit 3–1000 Zeichen eingeben.');return;}
  var result=await client.rpc('community_moderate_content',{p_target_type:type,p_target_id:id,p_action:action,p_reason:reason});
  if(result.error)window.alert(friendlyError(result.error));else{setStatus('admin-status','Beitragsmaßnahme gespeichert.');await loadAdmin();await loadFeed();}
}
async function resolveReport(report,status){
  var result=await client.rpc('community_resolve_report',{p_report_id:report.report_id,p_status:status});
  if(result.error)window.alert(friendlyError(result.error));else{setStatus('admin-status','Meldungsstatus aktualisiert.');await loadAdmin();}
}
async function loadAdmin(){
  if(!isAdmin||!session)return;setStatus('admin-status','Admin-Daten werden geladen …');
  try{
    var res=await Promise.all([
      client.from('community_admin_users').select('*').order('created_at',{ascending:false}).limit(150),
      client.from('community_admin_questions').select('*').order('created_at',{ascending:false}).limit(150),
      client.from('community_admin_answers').select('*').order('created_at',{ascending:false}).limit(250),
      client.from('community_admin_reports').select('*').order('created_at',{ascending:false}).limit(150),
      client.from('community_admin_moderation_actions').select('*').order('created_at',{ascending:false}).limit(50)
    ]);
    var failed=res.find(function(x){return x.error;});if(failed)throw failed.error;
    var users=res[0].data||[],questions=res[1].data||[],answers=res[2].data||[],reports=res[3].data||[],actions=res[4].data||[],list;
    list=$('admin-users');list.replaceChildren();if(!users.length)list.appendChild(el('p','muted','Noch keine Profile.'));
    users.forEach(function(user){
      var card=el('div','admin-item');appendAdminText(card,'strong','',user.username+' · '+user.status);appendAdminText(card,'code','admin-id',user.user_id);appendAdminText(card,'p','',user.question_count+' Fragen · '+user.answer_count+' Antworten · registriert '+formatDate(user.created_at));
      var buttons=el('div','admin-buttons');actionButton(buttons,'Verwarnen',function(){moderateUser(user,'warning');});actionButton(buttons,'7 Tage sperren',function(){moderateUser(user,'temporary_ban');},'danger');actionButton(buttons,'Dauerhaft sperren',function(){if(window.confirm('Dieses Konto dauerhaft sperren?'))moderateUser(user,'permanent_ban');},'danger');actionButton(buttons,'Entsperren',function(){moderateUser(user,'unban');});card.appendChild(buttons);list.appendChild(card);
    });
    list=$('admin-questions');list.replaceChildren();if(!questions.length)list.appendChild(el('p','muted','Noch keine Fragen.'));
    questions.forEach(function(q){
      var card=el('div','admin-item');appendAdminText(card,'strong','',q.title+' · '+q.status);appendAdminText(card,'p','',q.username||'Gelöschter Nutzer');appendAdminText(card,'p','',q.body);appendAdminText(card,'code','admin-id','Fragen-ID: '+q.question_id+' · Nutzer-ID: '+(q.user_id||'nicht mehr verknüpft'));
      var buttons=el('div','admin-buttons');actionButton(buttons,'Ausblenden',function(){moderateContent('question',q.question_id,'hide');});actionButton(buttons,'Entfernen',function(){if(window.confirm('Frage aus der öffentlichen Ansicht entfernen?'))moderateContent('question',q.question_id,'remove');},'danger');actionButton(buttons,'Wiederherstellen',function(){moderateContent('question',q.question_id,'restore');});card.appendChild(buttons);list.appendChild(card);
    });
    list=$('admin-answers');list.replaceChildren();if(!answers.length)list.appendChild(el('p','muted','Noch keine Antworten.'));
    answers.forEach(function(a){
      var card=el('div','admin-item');appendAdminText(card,'strong','',(a.username||'Gelöschter Nutzer')+' · '+a.status);appendAdminText(card,'p','',a.body);appendAdminText(card,'code','admin-id','Antwort-ID: '+a.answer_id+' · Fragen-ID: '+a.question_id+' · Nutzer-ID: '+(a.user_id||'nicht mehr verknüpft'));
      var buttons=el('div','admin-buttons');actionButton(buttons,'Ausblenden',function(){moderateContent('answer',a.answer_id,'hide');});actionButton(buttons,'Entfernen',function(){if(window.confirm('Antwort aus der öffentlichen Ansicht entfernen?'))moderateContent('answer',a.answer_id,'remove');},'danger');actionButton(buttons,'Wiederherstellen',function(){moderateContent('answer',a.answer_id,'restore');});card.appendChild(buttons);list.appendChild(card);
    });
    list=$('admin-reports');list.replaceChildren();if(!reports.length)list.appendChild(el('p','muted','Noch keine Meldungen.'));
    reports.forEach(function(report){
      var card=el('div','admin-item');appendAdminText(card,'strong','',report.target_type+' · '+report.status);appendAdminText(card,'p','',report.target_summary||'Beitrag');appendAdminText(card,'p','',report.target_body||'');appendAdminText(card,'p','','Meldung von '+(report.reporter_username||'gelöschter Nutzer')+': '+report.reason);appendAdminText(card,'code','admin-id','Meldungs-ID: '+report.report_id+' · Ziel-ID: '+report.target_id);
      var buttons=el('div','admin-buttons');actionButton(buttons,'In Prüfung',function(){resolveReport(report,'reviewing');});actionButton(buttons,'Erledigt',function(){resolveReport(report,'resolved');});actionButton(buttons,'Verwerfen',function(){resolveReport(report,'dismissed');});card.appendChild(buttons);list.appendChild(card);
    });
    list=$('admin-actions');list.replaceChildren();if(!actions.length)list.appendChild(el('p','muted','Noch keine Moderationsmaßnahmen protokolliert.'));
    actions.forEach(function(a){var card=el('div','admin-item');appendAdminText(card,'strong','',a.action+' · '+(a.target_username||a.target_user_id||'Unbekannter Nutzer'));appendAdminText(card,'p','',a.reason+' · '+formatDate(a.created_at));appendAdminText(card,'code','admin-id','Nutzer-ID: '+(a.target_user_id||'nicht mehr verknüpft'));list.appendChild(card);});
    setStatus('admin-status','Admin-Bereich aktualisiert: '+users.length+' Nutzer, '+reports.length+' Meldungen.');
  }catch(error){setStatus('admin-status','Admin-Daten konnten nicht geladen werden: '+friendlyError(error),true);}
}
$('refresh-admin').addEventListener('click',loadAdmin);
client.auth.onAuthStateChange(function(event,newSession){
  session=newSession;if(event==='PASSWORD_RECOVERY')$('password-recovery-panel').hidden=false;renderPermissionState();
  window.setTimeout(function(){checkPermissions().then(function(){return loadFeed();}).then(function(){if(isAdmin)return loadAdmin();}).catch(function(error){setStatus('feed-status',friendlyError(error),true);});},0);
});
client.auth.getSession().then(function(result){session=result.data?result.data.session:null;return checkPermissions();}).then(function(){return loadFeed();}).then(function(){if(isAdmin)return loadAdmin();}).catch(function(error){setStatus('feed-status',friendlyError(error),true);});
})();