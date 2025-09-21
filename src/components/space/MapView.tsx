'use client';

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

const MAP_PATH = '/src/app/(app)/space/[id]/map.tmj';
const TILESET_IMAGES = [
  { name: 'grass', path: '/src/public/map/grass.png' },
  { name: 'floor', path: '/src/public/map/floor.png' },
  { name: 'sofa', path: '/src/public/map/sofa.png' },
  { name: 'mac', path: '/src/public/map/mac.png' },
  { name: 'table', path: '/src/public/map/table.png' },
  { name: 'book', path: '/src/public/map/book.png' },
];
const AVATAR_IMG = '/src/public/map/mac.png';

class MapScene extends Phaser.Scene {
  avatar!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'MapScene' });
  }

  preload(): void {
    this.load.tilemapTiledJSON('map', MAP_PATH);
    TILESET_IMAGES.forEach(img => {
      this.load.image(img.name, img.path);
    });
    this.load.image('avatar', AVATAR_IMG);
  }

  create(): void {
    const map = this.make.tilemap({ key: 'map' });
    const tilesets = TILESET_IMAGES.map(img => map.addTilesetImage(img.name, img.name)).filter(Boolean);
    
    (map.layers as Array<{ name: string }>).forEach((layer: { name: string }) => {
      map.createLayer(layer.name, tilesets as Phaser.Tilemaps.Tileset[], 0, 0);
    });
    
    this.avatar = this.physics.add.sprite(100, 100, 'avatar');
    this.avatar.setCollideWorldBounds(true);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.cameras.main.startFollow(this.avatar);
  }

  update(): void {
    if (!this.avatar || !this.cursors) return;
    const speed = 200;
    this.avatar.setVelocity(0);
    if (this.cursors.left.isDown) {
      this.avatar.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.avatar.setVelocityX(speed);
    }
    if (this.cursors.up.isDown) {
      this.avatar.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.avatar.setVelocityY(speed);
    }
  }
}

const MapView: React.FC = () => {
  const phaserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: phaserRef.current || undefined,
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scene: MapScene,
    };
    
    const game = new Phaser.Game(config);
    
    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={phaserRef} style={{ width: '100%', height: '100%' }} />;
};

export default MapView;