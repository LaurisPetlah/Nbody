let frameRate = 60;
let secondsOfPlay = -1;
let time = 0;
let timeScalar =8;
let repetition = 1;
let globalId = 0;
let height = 0;
let width = 0;

let pixelScale = 0.05// pixel/meter
const debug = {
    displayDebug: false,
    focusId: 3,
    trackFocus: false,
    trackBiggest: true,
    displayNetForces: false,
    forceReadOut: false,
    positionReadout: false,
    forceLength: 1,
    radiusReadout: false,
    displayCenterCircle: false,
    centerCircleRadius: 0.5,
    perSecondReadout: false,
    displayParticleName: false,
    pause: false,
    secondsPerReadout: 1,
    trailLength: 50,
    trailsOn: true,
    pruneOffScreenParticles: true,
    allowScreenDrag: false,
    isScreenMoving: false,
    wireFrame: false,
    drawGroups: false,
    shootParticles:false,
    msPerParticleFire: 100
};


let setOfParticles = [];
let camera = {
    x: 0,
    y: 0
}
let sol = particle(
    screenToWorld(320, 320),
    1.989 * 10e30,
    vector(0, 0),
    696340e3,
    "#ffffff",
    "Sun"
)
let mercury = particle(
    addVector(sol.position, vector(57.9e9, 0)),
    0.330e24,
    vector(0, 47.4e3 * 3),
    (4879e3 / 2),
    "#aaaaaa",
    "Mercury"
)
let earth = particle(
    addVector(sol.position, vector(149.6e9, 0)),
    5.972e24,
    vector(0, 29.8e3 * 3),
    6371e3,
    "#0000ff",
    "Earth"
);
let moon = particle(
    addVector(earth.position, vector(384400e3, 0)),
    7.347e22,
    addVector(earth.velocity, vector(0, 1024 * 0.8)),
    1737.1e3,
    "#808080",
    "Moon"
)
let ISS = particle(
    addVector(earth.position, vector(6771000, 0)),
    45e4,
    vector(0, 7.65e3),
    0,
    "#ffffff",
    "ISS"

)
// HELPER FUNCTIONS
function vector(x, y) {
    return {
        x,
        y
    }
}
function particle(position, mass, velocity, radius, color, name) {
    globalId++;
    let p = {

        id: globalId,
        name: "",
        position: {
            x: 0,
            y: 0
        },
        unsignificantPos:{
            x:0,
            y:0
        },
        offset: {
            x: 0,
            y: 0
        },
        mass: 1,
        velocity: {
            x: 0,
            y: 0
        },
        radius: 1,
        color: "#" + randomHex(6),
        density: 5510,//kg/m3
        trail: [],
        children: [],
        head: null,
        totalMass: 1
    }
    if (name) {
        p.name = name;
    }
    if (position) {
        p.position = position;
    }
    if (mass) {
        p.mass = mass;
        p.totalMass = mass;
    }
    if (velocity) {
        p.velocity = velocity;
    }
    if (color) {
        p.color = color;
    }
    if (radius) {
        p.radius = radius;
    }
    return p;
}
function magnitude(x, y) {
    return Math.sqrt(x * x + y * y);
}
function mag(vector) {
    return magnitude(vector.x, vector.y);
}
function addVector(q1, q2) {
    return {
        x: q1.x + q2.x,
        y: q1.y + q2.y
    }
}
function subtractVector(q1, q2) {
    return {
        x: q1.x - q2.x,
        y: q1.y - q2.y
    }
}
function scaleVector(q, s) {
    return {
        x: q.x * s,
        y: q.y * s
    }
}

function unitVector(q) {
    let size = mag(q);
    if (size == 0) {
        size = 1;
    }
    return {
        x: q.x / size,
        y: q.y / size
    }
}
function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y


}

function screenToWorldVector(vector) {
    return screenToWorld(vector.x, vector.y);
}
function worldToScreenVector(vector) {
    return worldToScreen(vector.x, vector.y);
}

function screenToWorld(x, y) {
    return vector(camera.x + x / pixelScale, camera.y + y / pixelScale);

}
function worldToScreen(x, y) {
    return vector((x - camera.x) * pixelScale, (y - camera.y) * pixelScale);
}

function validTimeForReadout() {
    return time % (debug.secondsPerReadout * frameRate) === 0
}


function randomHex(len) {
    var maxlen = 8,
        min = Math.pow(16, Math.min(len, maxlen) - 1)
    max = Math.pow(16, Math.min(len, maxlen)) - 1,
        n = Math.floor(Math.random() * (max - min + 1)) + min,
        r = n.toString(16);
    while (r.length < len) {
        r = r + randHex(len - maxlen);
    }
    return r;
};
function getDistanceBetweenParticles(p1, p2) {
    return mag(subtractVector(p1.position, p2.position));
}
function getSurfaceDistanceBetweenParticles(p1, p2) {

    let distanceVector = subtractVector(p2.position, p1.position);
    let d = mag(distanceVector);
    let r1 = p1.radius;
    let r2 = p2.radius;
    let determinant = d - r1 - r2;
    return determinant;
}



// MATH FUNCTIONS

function validateParticleAttributes(p) {
    const netAttributes = getNetAttributesFromSystem(p);


    for (const child of netAttributes.children) {
        child.totalMass = netAttributes.mass;
        const newPos = netAttributes.position;
        const oldPos = getComponentPosition(child);
        const offset = subtractVector(oldPos, newPos);
        child.offset = offset;
        child.position = newPos;
        child.velocity = p.velocity;

    }

    p.totalMass = netAttributes.mass;
    const newPos = netAttributes.position;
    const oldPos = getComponentPosition(p);
    const offset = subtractVector(oldPos, newPos);
    p.offset = offset;
    p.position = newPos;



}
function getNetAttributesFromSystem(p) {
    let att = {
        mass: p.mass,
        position: p.position,
        children: p.children,
        velocity: p.velocity
    }

    for (const q of p.children) {
        const childAtt = getNetAttributesFromSystem(q);
        const weightedPosition = scaleVector(att.position, att.mass);
        const childWeightedPosition = scaleVector(childAtt.position, childAtt.mass);
        const sumPos = addVector(weightedPosition, childWeightedPosition);
        let massSum = childAtt.mass + att.mass;
        att.mass = massSum;
        att.position = scaleVector(sumPos, 1 / massSum);
        att.children = att.children.concat(childAtt.children);

        const momentumOfP1 = scaleVector(att.velocity, att.mass);
        const momentumOfP2 = scaleVector(childAtt.velocity, childAtt.mass);
        let velocityFinal = scaleVector(addVector(momentumOfP1, momentumOfP2), 1 / (massSum));
        att.velocity = velocityFinal
    }
    return att;


}
function validateChildrenPositions(p) {
    for (const q of p.children) {
        q.position = p.position;
        validateChildrenPositions(q);
    }
}
function addChildToParticle(parent, child) {
    parent.children.push(child);
    child.head = parent;
    validateParticleAttributes(getParticleHead(parent));
}

function updatePositionOfParticle(p, t) {
    const v = scaleVector(p.velocity, t);
    p.position = addVector(p.position, v);

    // console.log(validTimeForReadout())
    if (p.id === debug.focusId && debug.positionReadout && validTimeForReadout()) {
        // console.log(p);
        console.table({ name: p.name, p: p.position, pRel: worldToScreenVector(p.position) });
    }
    const directVector = subtractVector(p.position, screenToWorld(width / 2, height / 2));
    const dist = mag(directVector);
    if (dist > mag(screenToWorld(width,height))*2&& debug.pruneOffScreenParticles) {
        removeParticleByID(p.id, setOfParticles);
    }
}
function updateAllPositions(setOfParticles, t) {
    for (const p of setOfParticles) {
        updatePositionOfParticle(p, t);
    }
}
function updateVelocityOfParticle(p, setOfParticles, t) {
    let mi = p.totalMass;
    let qi = p.position;
    let g = 6.673e-11;
    let sum = vector(0, 0);
    for (const j of setOfParticles) {
        if (j.id === p.id || j.head) {
            continue;
        }
        if (getSurfaceDistanceBetweenParticles(p, j) <= 0) {
            continue;
        }
        mj = j.mass;
        qj = j.position;
        const directVector = subtractVector(qj, qi);

        const dist = mag(directVector);

        if (dist <= 0) {
            continue;
        }

        const numeratorCoeffecient = g * mi * mj

        const denominator = Math.pow(dist, 2);
        if (denominator <= 0) {
            break;
            denominator = 1;
        }
        const numerator = scaleVector(unitVector(directVector), numeratorCoeffecient);

        const quotient = scaleVector(numerator, 1 / denominator);

        sum = addVector(sum, quotient);
        if (debug.forceReadOut && validTimeForReadout() && debug.focusId == p.id) {
            console.table({
                directVector,
                dist,
                numerator,
                denominator,
                quotient,
                sum
            })
        }
        // console.log(p.id, "onto",j.id);
        // console.table({
        //     sum
        // });
        // SUM IS EQUAL TO FORCE NOT VELOCITY
    }
    const acceleration = scaleVector(sum, 1 / mi);
    const deltaVelocity = scaleVector(acceleration, t);
    const v0 = p.velocity;
    p.velocity = addVector(v0, deltaVelocity);
    if (debug.forceReadOut && repetition % (debug.secondsPerReadout * frameRate) === 0 && p.id === debug.focusId) {

        // console.table({ name: p.name, mi, t })
        console.table({
            name: p.name,
            mi,
            t,
            force: sum,
            a: acceleration,
            v0,
            delta: deltaVelocity,
            v: p.velocity
        });
    }

}
function updateAllParticleVelocities(setOfParticles, t) {
    for (const p of setOfParticles) {
        if (!p.head) {

            updateVelocityOfParticle(p, setOfParticles, t);
            matchParentChildrenVelocities(p);
        }

    }
}
function matchParentChildrenVelocities(p) {
    for (const q of p.children) {
        q.velocity = p.velocity;
        matchParentChildrenVelocities(q);
    }
}
function combineTwoParticles(p1, p2) {
    const combinedMass = p1.mass + p2.mass

    // VELOCITY AFTER COLLISION
    const momentumOfP1 = scaleVector(p1.velocity, p1.mass);
    const momentumOfP2 = scaleVector(p2.velocity, p2.mass);
    let velocityFinal = scaleVector(addVector(momentumOfP1, momentumOfP2), 1 / combinedMass);
    // velocityFinal = vector(0,0);
    // Radius after collision
    const radius = Math.pow(Math.pow(p1.radius, 3) + Math.pow(p2.radius, 3), 1 / 3);

    // cosmetic
    let biggerParticle = p1;
    if (p2.mass > p1.mass) {
        biggerParticle = p2;
    }

    let p3 = particle(
        biggerParticle.position,
        combinedMass,
        velocityFinal,
        radius,
        biggerParticle.color,
        biggerParticle.name
    )
    p3.trail = biggerParticle.trail;
    return p3
}

function connectTwoParticles(p1, p2) {
    p1.connected.push(p2);
    p2.head = p1;
    const combinedMass = p1.mass + p2.mass

    // VELOCITY AFTER COLLISION
    const momentumOfP1 = scaleVector(p1.velocity, p1.mass);
    const momentumOfP2 = scaleVector(p2.velocity, p2.mass);
    let velocityFinal = scaleVector(addVector(momentumOfP1, momentumOfP2), 1 / combinedMass);
    p1.velocity = velocityFinal;
    p2.velocity = velocityFinal;

}
function getComponentPosition(p) {
    return addVector(p.position, p.offset);
}
function getParticleHead(p) {
    if (p.head) {
        return getParticleHead(p.head);
    }
    return p;
}
function getParticleByID(id) {
    for (const p of setOfParticles) {
        if (p.id === id) {
            return p
        }
    }
    return null;
}
function getParticleByName(name, setOfParticles) {
    for (const p of setOfParticles) {
        if (p.name === name) {
            return p
        }
    }
    return null;
}
function removeParticleByID(id, setOfParticles) {
    for (let i = 0; i < setOfParticles.length; i++) {
        const p = setOfParticles[i];
        if (p.id === id) {
            setOfParticles.splice(i, 1);
        }

    }
}
function addParticle(p, setOfParticles) {
    setOfParticles.push(p);
}
function performCollision(p1, p2, setOfParticles) {
    const p3 = combineTwoParticles(p1, p2);
    removeParticleByID(p1.id, setOfParticles);
    removeParticleByID(p2.id, setOfParticles);
    addParticle(p3, setOfParticles);

}
function elasticCollision(p1, p2, setOfParticles) {
    const head1 = getParticleHead(p1);
    const head2 = getParticleHead(p2);
    const v1 = p1.velocity;
    const v2 = p2.velocity;
    const m1 = head1.totalMass;
    const m2 = head2.totalMass;
    const x1 = getComponentPosition(p1);
    const x2 = getComponentPosition(p2);

    const coeff1 = 2 * m2 / (m1 + m2);
    const v1_v2 = subtractVector(v1, v2);
    const x1_x2 = subtractVector(x1, x2);
    const dot1 = dotProduct(v1_v2, x1_x2);
    const d1 = Math.pow(mag(x1_x2), 2);
    const product1 = coeff1 * (dot1 / d1);
    const scale1 = scaleVector(x1_x2, product1);
    let v1f = subtractVector(v1, scale1);

    const coeff2 = 2 * m1 / (m1 + m2);
    const v2_v1 = subtractVector(v2, v1);
    const x2_x1 = subtractVector(x2, x1);
    const dot2 = dotProduct(v2_v1, x2_x1);
    const d2 = Math.pow(mag(x2_x1), 2);
    const product2 = coeff2 * (dot2 / d2);
    const scale2 = scaleVector(x2_x1, product2);
    let v2f = subtractVector(v2, scale2);
    let combineThreshold = 0.0005
    keepApart(p1, p2);
    if (mag(v1f) < combineThreshold && mag(v2f) < combineThreshold) {
        // addChildToParticle(p2, p1);
        head1.velocity = scaleVector(v1f, 0.1);
        head2.velocity = scaleVector(v2f, 0.1);

    }
    else {
        head1.velocity = scaleVector(v1f, 0.9);
        head2.velocity = scaleVector(v2f, 0.9);
    }
    // p1.position = addVector(p1.position, p1.velocity);
    // p2.position = addVector(p2.position, p2.velocity);


}

function keepApart(p1, p2) {

    let distanceVector = subtractVector(p2.position, p1.position);
    let distanceUnitVector = unitVector(distanceVector);
    let d = mag(distanceVector);
    let r1 = p1.radius;
    let r2 = p2.radius;
    let determinant = d - r1 - r2;


    if (determinant >= 0) {
        return;
    }
    determinant *= 1;
    const head1 = getParticleHead(p1);
    const head2 = getParticleHead(p2);
    head1.position = addVector(head1.position, scaleVector(distanceUnitVector, determinant));
    // head2.position = addVector(head2.position, scaleVector(distanceUnitVector, -determinant));



}
function checkSquareCollision(p1, p2) {
    const rect1 = {
        x: p1.x - p1.r,
        y: p1.y - p1.r,
        width: p1.r * 2,
        height: p1.r * 2
    }
    const rect2 = {
        x: p2.x - p2.r,
        y: p2.y - p2.r,
        width: p2.r * 2,
        height: p2.r * 2
    }

    if (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y) {
        // collision detected!
        return true;
    }
    return false
}
function validateAllCollisions(setOfParticles) {
    for (let i = 0; i < setOfParticles.length; i++) {
        const p = setOfParticles[i];
        for (let j = i; j < setOfParticles.length; j++) {
            const q = setOfParticles[j];

            if (q.id == p.id) {
                continue;
            }
            if (getParticleHead(p) === getParticleHead(q)) {
                continue
            }

            let d = mag(subtractVector(getComponentPosition(q), getComponentPosition(p)));
            let r1 = p.radius;
            let r2 = q.radius;
            let determinant = d - r1 - r2;

            // checkSquareCollision(p, q);
            if (determinant < 0) {

                // if(checkSquareCollision(p,q)){
                // p.position = subtractVector(p.position, vector(0.01,0));
                // q.position = subtractVector(q.position, q.velocity);
                // keepApart(p,q);
                performCollision(p, q, setOfParticles);
                // elasticCollision(p, q, setOfParticles);
                // keepApart(p, q);
                // keepApart(p,q);
                // redundantCollisions.push(q);.............
                continue;
            }

        }

    }
}

function update(t) {

    validateAllCollisions(setOfParticles);
    updateAllParticleVelocities(setOfParticles, t);
    updateAllPositions(setOfParticles, t);
    updateAllParticleTrails(setOfParticles);
    if(debug.trackBiggest && setOfParticles.length>0){
        let max = setOfParticles[0];
        for (const p of setOfParticles) {
            if(p.radius > max.radius){
                max = p
            }
        }
        
        debug.focusId = max.id;
        trackParticle();
    }
    // console.table(setOfParticles);
}

// ACTION EVENTS AND LISTENERS




// DISPLAY  FUNCTIONS
function getParticleRadius(p) {
    const d = p.density;
    const m = p.mass;
    const pi = Math.PI;

    const determinant = (m / d) * (3 / 4) * pi;

    const radius = Math.pow(determinant, 1 / 3);
    if (debug.radiusReadout && validTimeForReadout() && p.id === debug.focusId) {
        console.table({ d, m, pi, determinant, radius })
    }
    return radius;
}
function drawTrail(p, ctx) {
    ctx.beginPath()
    ctx.lineWidth = p.radius*pixelScale*2
    ctx.strokeStyle = p.color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round"

    for (const worldPosition of p.trail) {
        const v = worldToScreenVector(worldPosition);
        ctx.lineTo(v.x, v.y);
    }
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.closePath();
    
}
function drawForceVector(p, ctx) {
    ctx.beginPath();
    let updatedVector = addVector(worldToScreenVector(p.position), vector(0, 0));
    ctx.moveTo(updatedVector.x, updatedVector.y);
    let updatedVelocity = scaleVector(p.velocity, pixelScale);
    const forceLength = debug.forceLength;
    ctx.lineTo(updatedVector.x + updatedVelocity.x * forceLength, updatedVector.y + updatedVelocity.y * forceLength);
    ctx.closePath();
    ctx.strokeStyle = "#00ff00";
    ctx.stroke();
}
function trackParticle(setOfParticles) {
    let p = getParticleByID(debug.focusId, setOfParticles);
    if (p === null) {
        return;
    }
    let v1 = p.position;
    let v2 = screenToWorld(width / 2, height / 2);

    let v3 = subtractVector(v1, v2);
    camera = addVector(camera, v3);

}
function draw() {
    let canvas = document.querySelector("canvas");
    let ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    height = canvas.height;
    width = canvas.width;
    // ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (debug.trackFocus) {
        trackParticle();
    }
    // drawing each particle;
    for (const p of setOfParticles) {
        ctx.beginPath();
        let screenPosition = addVector(worldToScreenVector(addVector(p.position, p.offset)), vector(0, 0));
        ctx.moveTo(screenPosition.x, screenPosition.y);
        let r = p.radius * pixelScale;
        // ctx.fillRect(screenPosition.x - r, screenPosition.y - r, 2 * r, 2 * r);
        ctx.ellipse(screenPosition.x, screenPosition.y, r, r, 0, 0, 360);
        ctx.closePath();
        p.color = "rgba(255,255,255,1)"
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        if (debug.wireFrame) {

            ctx.stroke();
        }
        else {

            ctx.fill();
        }
        if (debug.displayNetForces) {
            drawForceVector(p, ctx);
        }
        if (debug.trailsOn) {
            drawTrail(p, ctx);
        }
        if (debug.displayCenterCircle) {

            ctx.fillStyle = "#ffffff";
            const COM = worldToScreenVector(p.position);
            ctx.fillRect(screenPosition.x - debug.centerCircleRadius, screenPosition.y - debug.centerCircleRadius, debug.centerCircleRadius * 2, debug.centerCircleRadius * 2);
            ctx.fillRect(COM.x - debug.centerCircleRadius, COM.y - debug.centerCircleRadius, debug.centerCircleRadius * 2, debug.centerCircleRadius * 2);
        }
        if (debug.drawGroups) {
            ctx.beginPath();
            for (const child of p.children) {
                ctx.moveTo(screenPosition.x, screenPosition.y);
                const pos = worldToScreenVector(getComponentPosition(child));
                ctx.lineTo(pos.x, pos.y);

            }
            ctx.closePath();
            ctx.stroke();
        }
        if (debug.displayParticleName) {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(p.name, screenPosition.x, screenPosition.y - 5);
        }
    }
    if(debug.displayDebug){

        for (let i = 0; i < Object.entries(debug).length; i++) {
            ctx.fillStyle = "#FFFFFF";
            const entry = Object.entries(debug)[i];
            ctx.fillText(entry[0] + " : " + entry[1], 16, 16 + i * 12);
            
        }
    }

}
function updateParticleTrail(p) {
    p.trail.push(getComponentPosition(p));

    while (p.trail.length > debug.trailLength) {
        p.trail.shift();
    }
}
function updateAllParticleTrails(setOfParticles) {
    for (const p of setOfParticles) {
        updateParticleTrail(p);
    }
}
async function gameLoop() {
    const msPerFrame = 1000 / frameRate;

    while (repetition > 0) {
        let p = setOfParticles[debug.focusId - 1];
        if (debug.perSecondReadout) {

        }
        let startTime = new Date().getTime();
        if (!debug.pause) {
            update(msPerFrame * timeScalar);
            draw();
            // repetition--;
            time++;

        }


        let endTime = new Date().getTime();
        let elapsedTime = endTime - startTime;
        await sleep(msPerFrame - elapsedTime);

    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function handleDragStart(event) {
    
    debug.mouse = vector(event.clientX,event.clientY);
    shootParticles(50,7e10,.2,screenToWorldVector(debug.mouse),2)
    if (!debug.allowScreenDrag) {
        return;
    }
    debug.isScreenMoving = true;

}

function handleDragEnd(event) {
    if (!debug.allowScreenDrag) {
        return;
    }
    debug.isScreenMoving = false;
}

function handleDragDuring(event) {
    if (debug.isScreenMoving) {
        camera.x -= event.movementX / pixelScale;
        camera.y -= event.movementY / pixelScale;
    }
}

function handleScroll(event) {
    let oldScale = pixelScale;
    let v1 = screenToWorld(width / 2, height / 2);
    pixelScale *= Math.pow(10, -event.deltaY / 1250);
    let newScale = pixelScale;
    let scale = newScale / oldScale;
    let v2 = screenToWorld(width / 2, height / 2);
    let v3 = subtractVector(v2, v1);
    camera.x -= v3.x;
    camera.y -= v3.y;
    // camera = addVector(camera,v);
}

function handleKeyDown(event) {
    let key = event.key;

    if (key == ".") {
        timeScalar *= 2;
    }
    if (key == ",") {
        timeScalar /= 2;
    }
    if (key == ">") {
        timeScalar *= 10
    }
    if (key == "<") {
        timeScalar /= 10
    }
    timeScalar = Math.max(0, timeScalar);
}
function mousePressDown(event){

}
function initializeGameState() {
    document.onmousedown = handleDragStart;
    document.onmouseup = handleDragEnd;
    document.onmousemove = handleDragDuring;
    document.onwheel = handleScroll;
    document.onkeydown = handleKeyDown;
    
    globalId = 0;

    setOfParticles = [

    ]
    // addParticles(100);
}

function addParticles(n, mass, velocity) {
    for (let index = 0; index < n; index++) {
        if (!mass) {
            mass = 1e15;
        }
        if (!velocity && velocity != 0) {
            velocity = 1e4;
        }
        let p = particle(
            screenToWorld(320, 320),
            mass,
            0,
            0,
            "#" + randomHex(6),
            ("p")
        );
        
        p.name = "p: " + p.id;
        p.radius = Math.pow(p.mass, 1 / 4) / 10;
        // p.radius = 0.5
        const a = Math.random()*360
        const unitAngleVector = vector(Math.cos(a),Math.sin(a));
        const d = Math.random()*712/2;
        p.position = addVector(screenToWorldVector(scaleVector(unitAngleVector,d)),screenToWorld(width/2,height/2));
        // p.position = screenToWorld(Math.random() * width, Math.random() * height);
        const unitPositionRel = unitVector(subtractVector(p.position,screenToWorld(width/2,height/2)));
        const vBasis = {
            x: unitPositionRel.y,
            y: -unitPositionRel.x
        }
        p.velocity = Math.random()>0.5? scaleVector(vBasis,velocity): scaleVector(vBasis,-velocity);
        p.velocity = scaleVector(vBasis,velocity)
        // p.velocity = addVector(p.velocity,scaleVector(unitPositionRel,-0.001))
        setOfParticles.push(p);

    }
}
function shootParticles(n,mass,velocity, location,variance){
    for (let i = 0; i < n; i++) {
        let pos =vector( Math.random()*2-1, Math.random()*2-1)
        pos = unitVector(pos);

        const dist = magnitude(width/2,height/2);
        pos = scaleVector(pos,dist);
        pos = screenToWorldVector(addVector(pos,vector(width/2,height/2)));
        let vectorToLocation = subtractVector(location,pos);
        vectorToLocation = unitVector(vectorToLocation);
        vectorToLocation = addVector(vectorToLocation,scaleVector(vector( Math.random()*2-1, Math.random()*2-1),variance));
        vectorToLocation = unitVector(vectorToLocation);
        let p = particle(
            pos,
            mass,
            scaleVector(vectorToLocation,velocity),
            Math.pow(mass, 1 / 4) / 10,
            "#ffffff",
            "i"
        )
        addParticle(p,setOfParticles);

        
    }
}
gameLoop();
initializeGameState();
// addParticles(1, 1e10, 0);
// addParticles(100, 1e6, .05);
// addParticles(800, 6e4, .1);
if(document.documentElement.clientWidth< 540){

    addParticles(50, 2e10, .05);
}
else{

    addParticles(500, 2e9, .05);
}
pixelScale = 0.05 * (document.documentElement.clientWidth/720)
    // shootParticles(50,7e10,.2,screenToWorld(width/2,height)),1)
// shootParticles(500,2e9,0.5,screenToWorld(width/2,height/2),1)
// addParticle(a1,setOfParticles);
// addParticle(a2,setOfParticles);
// debug.displayCenterCircle = true
// debug.displayParticleName=true
// timeScalar=0.01
// addParticles(1000, 1e8, .01);