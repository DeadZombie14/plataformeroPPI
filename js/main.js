var config = {
    type: Phaser.AUTO,
    width: 480,
    height: 320,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 500},
            debug: false
        }
    },
    scene: {
        key: 'main',
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var map;
var player;
var controles;
var groundLayer, coinLayer;
var text;
var score = 0;
var enemigos = [];

function preload() {
    // Mapa Tiled y sus sprites
    this.load.tilemapTiledJSON('map', 'assets/map.json');
    this.load.spritesheet('tiles', 'assets/tiles.png', {frameWidth: 32, frameHeight: 32});
    this.load.image('coin', 'assets/coinGold.png');
    this.load.image('enemigo', 'assets/enemigo.png');
    // Atlas jugador
    this.load.atlas('rana', 'assets/rana.png', 'assets/rana.json');
    // Atlas enemigo
    this.load.atlas('goomba', 'assets/goomba.png', 'assets/goomba.json');
}

function create() {
    map = this.make.tilemap({key: 'map'});
    
    // Crear capas del mundo
    var groundTiles = map.addTilesetImage('tiles');
    groundLayer = map.createDynamicLayer('World', groundTiles, 0, 0);
    groundLayer.setCollisionByExclusion([-1]);
    var coinTiles = map.addTilesetImage('coin');
    coinLayer = map.createDynamicLayer('Coins', coinTiles, 0, 0);
    var enemigos = map.addTilesetImage('enemigo');
    enemigos = map.createDynamicLayer('Enemigos', enemigos, 0, 0);
    
    // Aplicar fisicas al mapa
    this.physics.world.bounds.width = groundLayer.width;
    this.physics.world.bounds.height = groundLayer.height;
    
    // Crear jugador    
    player = this.physics.add.sprite(32, 800, 'rana');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);  
    this.physics.add.collider(groundLayer, player);
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNames('rana', {prefix: 'rana', start: 1, end: 11}),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNames('rana', {prefix: 'rana_walk', start: 1, end: 12}),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'falling',
        frames: [{key: 'rana', frame: 'rana_fall'}],
        frameRate: 10
    });
    player.morir = () => {
        let msgMuerte = this.add.text(20, 160, 
            "HAS MUERTO\nPresiona F5 para reiniciar"
            , {
            fontSize: '20px',
            fill: '#F00'
        });
        msgMuerte.setScrollFactor(0);
    }
    
    // Camara
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player);
    this.cameras.main.setBackgroundColor('#ccccff');
    
    // Logica recoger monedas
    coinLayer.setTileIndexCallback(1, function (sprite, tile) {
        coinLayer.removeTileAt(tile.x, tile.y);
        score++;
        text.setText('Monedas: '+score);
        return false;
    }, this);
    this.physics.add.overlap(player, coinLayer);
    text = this.add.text(0, 300, 'Monedas: 0', {
        fontSize: '20px',
        fill: '#FF0'
    });
    text.setScrollFactor(0);

    // Controles
    controles = this.input.keyboard.createCursorKeys();

    // Crear enemigo
    crearEnemigo(192,800, this);
    crearEnemigo(320,800, this);
}

function crearEnemigo(x, y, escenario) {
    // Crear enemigo
    let enemigo = escenario.physics.add.sprite(x, y, 'goomba');
    escenario.physics.add.collider(enemigo, groundLayer);
    enemigo.setCollideWorldBounds(true); 
    enemigo.setBounce(0); 
    escenario.anims.create({
        key: 'goombaMove',
        frames: escenario.anims.generateFrameNames('goomba', {prefix: 'goomba', start: 1, end: 2 }),
        frameRate: 3,
        repeat: -1
    });
    escenario.anims.create({
        key: 'goombaDeath',
        frames: [{key: 'goomba', frame: 'goomba_dead'}],
        frameRate: 7
    });
    enemigo.setVelocityX(-40);
    enemigo.anims.play('goombaMove', true);
    enemigo.dir = 'r';
    enemigo.dead = false;
    escenario.physics.add.collider(enemigo, player,  (p,tile) => {
        if (enemigo.dead) return;
        if (enemigo.body.touching.up) {
            enemigo.anims.play('goombaDeath', true);
            player.body.setVelocityY(-400);
            enemigo.dead = true;
            enemigo.destroy();
        } else {
            player.morir();
            escenario.physics.world.pause();
        }
    }, null, escenario);
    enemigos.push(enemigo);
}

function update(time, delta) {
    if(enemigos.length > 0) {
        for (let i = 0; i < enemigos.length; i++) {
            if(!enemigos[i].dead) {
                if (enemigos[i].body.blocked.right ||  enemigos[i].body.touching.right) {
                    this.dir = 'l';
                } else if (enemigos[i].body.blocked.left ||  enemigos[i].body.touching.left) {
                    this.dir = 'r';
                }
                if (this.dir === 'r') {
                    enemigos[i].body.setVelocityX(40);
                } else if (this.dir == 'l') {
                    enemigos[i].body.setVelocityX(-40);
                }
            }
            
        }
    }

    if (controles.left.isDown) {
        player.body.setVelocityX(-200);
        player.anims.play('walk', true);
        player.flipX = true;
    } else if (controles.right.isDown) {
        player.body.setVelocityX(200);
        player.anims.play('walk', true);
        player.flipX = false;
    } else {
        player.body.setVelocityX(0);
        player.anims.play('idle', true);
    }
    if (controles.up.isDown && player.body.onFloor()) {
        player.body.setVelocityY(-500);        
    }
    if(!player.body.onFloor()) {
        player.anims.play('falling', true);
    }
}