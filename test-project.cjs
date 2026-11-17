const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({document:{addEventListener(){}},console});
vm.runInContext(fs.readFileSync('project.js','utf8'),context);
const run=source=>vm.runInContext(source,context);
assert.equal(run('PLAN_DAYS'),243);
assert.equal(run('dateISO(monthDate(0))'),'2025-12-01');
assert.equal(run('dateISO(monthDate(1))'),'2026-01-01');
assert.equal(run('dateISO(monthDate(2))'),'2026-02-01');
assert.equal(run('dateISO(monthDate(3))'),'2026-03-01');
assert.equal(run('dateISO(monthDate(3.5))'),'2026-03-17');
assert.equal(run('dateISO(monthDate(8))'),'2026-08-01');
for(let day=0;day<=243;day++){assert.equal(run(`monthDate(positionAt(PLAN_START+${day}*DAY_MS))`),run(`PLAN_START+${day}*DAY_MS`));}
for(const scale of [0.9,3.2,7,22]){context.scale=scale;assert.equal(run('projectGeometry([{id:1,start:0,duration:1}],scale)[0].width'),31*scale);assert.equal(run('projectGeometry([{id:1,start:2,duration:1}],scale)[0].width'),28*scale);assert.equal(run('projectGeometry([{id:1,start:2,duration:1}],scale)[0].x'),62*scale);}
console.log('Verificado: 243 días, fechas y longitudes proporcionales en las cuatro escalas; conversión reversible de cada fecha del plan.');
