const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export function flattenLocale(input) {
  if (!isPlainObject(input)) throw new TypeError('A locale file must contain a JSON object at its root.');
  const messages = {}, diagnostics = [];
  function visit(value, path) {
    if (typeof value === 'string') { messages[path] = value; return; }
    if (isPlainObject(value)) {
      const entries = Object.entries(value);
      if (!entries.length) diagnostics.push({ code:'empty_object', key:path || '(root)', message:'Empty object contains no translatable strings.' });
      for (const [key, child] of entries) visit(child, path ? `${path}.${key}` : key);
      return;
    }
    if (Array.isArray(value)) { value.forEach((child,index)=>visit(child,`${path}[${index}]`)); return; }
    diagnostics.push({code:'non_string_value',key:path || '(root)',message:`Expected a string, object or array; received ${value===null?'null':typeof value}.`});
  }
  visit(input,'');
  if (!Object.keys(messages).length) throw new TypeError('No translatable string values were found in this locale file.');
  return {messages,diagnostics};
}
export function extractPlaceholders(value) {
  const tokens=[], text=String(value??'');
  const bracePattern=/\{\{?\s*([A-Za-z_][\w.-]*)\s*(?=,|\})/g;
  const printfPattern=/%(?:\d+\$)?(?:\([\w.-]+\))?[+#0\- ]*(?:\d+|\*)?(?:\.(?:\d+|\*))?[sdif]/g;
  const colonPattern=/(?<!:)\:([A-Za-z_][\w]*)\b/g;
  for(const m of text.matchAll(bracePattern)) tokens.push(`{${m[1]}}`);
  for(const m of text.matchAll(printfPattern)) tokens.push(m[0]);
  for(const m of text.matchAll(colonPattern)) tokens.push(`:${m[1]}`);
  return [...new Set(tokens)].sort();
}
export function extractHtmlTags(value) {
  const counts=new Map(), pattern=/<\/?([a-z][a-z0-9:-]*)\b[^>]*>/gi;
  for(const m of String(value??'').matchAll(pattern)){const tag=m[1].toLowerCase();counts.set(tag,(counts.get(tag)||0)+1);}
  return Object.fromEntries([...counts.entries()].sort(([a],[b])=>a.localeCompare(b)));
}
function issue(locale,key,code,severity,message,sourceValue='',targetValue=''){return {locale,key,code,severity,message,sourceValue,targetValue};}
export function compareLocaleFiles(sourceLocale,targetLocale,options={}) {
  const source=sourceLocale.messages||sourceLocale,target=targetLocale.messages||targetLocale;
  const sourceName=sourceLocale.name||options.sourceName||'source',targetName=targetLocale.name||options.targetName||'target';
  const expansionLimit=Number.isFinite(options.expansionLimit)?options.expansionLimit:1.5,maxCharacters=Number.isFinite(options.maxCharacters)?options.maxCharacters:160;
  const issues=[],sourceKeys=Object.keys(source).sort(),targetKeys=Object.keys(target).sort(),sourceSet=new Set(sourceKeys),targetSet=new Set(targetKeys);
  for(const key of sourceKeys){
    const sourceValue=String(source[key]??'');
    if(!targetSet.has(key)){issues.push(issue(targetName,key,'missing_key','error','Translation key is missing.',sourceValue,''));continue;}
    const targetValue=String(target[key]??'');
    if(!targetValue.trim()){issues.push(issue(targetName,key,'empty_translation','error','Translation is empty or contains only whitespace.',sourceValue,targetValue));continue;}
    const sourceTokens=extractPlaceholders(sourceValue),targetTokens=extractPlaceholders(targetValue);
    if(JSON.stringify(sourceTokens)!==JSON.stringify(targetTokens)) issues.push(issue(targetName,key,'placeholder_mismatch','error',`Placeholders differ. Expected: ${sourceTokens.join(', ')||'none'}; found: ${targetTokens.join(', ')||'none'}.`,sourceValue,targetValue));
    const sourceTags=extractHtmlTags(sourceValue),targetTags=extractHtmlTags(targetValue);
    if(JSON.stringify(sourceTags)!==JSON.stringify(targetTags)) issues.push(issue(targetName,key,'markup_mismatch','warning','HTML tag counts differ between source and translation.',sourceValue,targetValue));
    const sourceBreaks=(sourceValue.match(/\n/g)||[]).length,targetBreaks=(targetValue.match(/\n/g)||[]).length;
    if(sourceBreaks!==targetBreaks) issues.push(issue(targetName,key,'line_break_mismatch','warning',`Line breaks differ (${sourceBreaks} in source, ${targetBreaks} in translation).`,sourceValue,targetValue));
    const sourceLength=[...sourceValue].length,targetLength=[...targetValue].length,ratio=sourceLength>0?targetLength/sourceLength:null;
    if(targetLength>maxCharacters||(ratio!==null&&ratio>expansionLimit&&targetLength>=24)){const detail=ratio===null?`${targetLength} characters`:`${ratio.toFixed(2)}× source length (${targetLength} characters)`;issues.push(issue(targetName,key,'text_expansion','warning',`Translation may need extra layout space: ${detail}.`,sourceValue,targetValue));}
  }
  for(const key of targetKeys) if(!sourceSet.has(key)) issues.push(issue(targetName,key,'extra_key','info','Key exists in the translation but not in the source locale.','',String(target[key]??'')));
  const present=sourceKeys.filter(key=>targetSet.has(key)&&String(target[key]??'').trim()).length,errors=issues.filter(x=>x.severity==='error').length,warnings=issues.filter(x=>x.severity==='warning').length,infos=issues.filter(x=>x.severity==='info').length;
  return {source:sourceName,locale:targetName,totalKeys:sourceKeys.length,translatedKeys:present,coverage:sourceKeys.length?Math.round(present/sourceKeys.length*1000)/10:100,errors,warnings,infos,issues};
}
export function buildReport(sourceLocale,targetLocales,options={}) {
  const comparisons=targetLocales.map(target=>compareLocaleFiles(sourceLocale,target,options));
  return {tool:'LocaleGuard',schemaVersion:1,generatedAt:new Date().toISOString(),source:sourceLocale.name||'source',options:{expansionLimit:options.expansionLimit??1.5,maxCharacters:options.maxCharacters??160},summary:{locales:comparisons.length,keys:Object.keys(sourceLocale.messages||sourceLocale).length,errors:comparisons.reduce((s,x)=>s+x.errors,0),warnings:comparisons.reduce((s,x)=>s+x.warnings,0)},comparisons};
}
function csvCell(value){const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
export function reportToCsv(report){const rows=[['locale','severity','code','key','message','source_text','translation_text']];for(const comparison of report.comparisons)for(const item of comparison.issues)rows.push([item.locale,item.severity,item.code,item.key,item.message,item.sourceValue,item.targetValue]);return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
export function reportToMarkdown(report){
  const lines=['# LocaleGuard report','',`- Source locale: **${report.source}**`,`- Generated: ${report.generatedAt}`,`- Keys checked: ${report.summary.keys}`,`- Errors: **${report.summary.errors}** · Warnings: **${report.summary.warnings}**`,''];
  for(const comparison of report.comparisons){lines.push(`## ${comparison.locale}`,'',`Coverage: **${comparison.coverage}%** · ${comparison.translatedKeys}/${comparison.totalKeys} translated · ${comparison.errors} errors · ${comparison.warnings} warnings`,'');if(!comparison.issues.length){lines.push('No issues detected.','');continue;}lines.push('| Severity | Key | Check | Details |','|---|---|---|---|');for(const item of comparison.issues){const safe=value=>String(value).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');lines.push(`| ${item.severity} | \`${safe(item.key)}\` | ${item.code} | ${safe(item.message)} |`);}lines.push('');}
  return lines.join('\n');
}