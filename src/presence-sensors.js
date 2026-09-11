export const sensorTypes=['hue_motion_sensor','everything_presence_pro','everything_presence_one','everything_presence_lite'];
export const isPresenceSensor=item=>sensorTypes.includes(item.type);
export function sensorPlacement(floor,item){
  const m=item.mount;if(!m)return {};
  const width=floor.width_m || 10,depth=floor.depth_m || width/(floor.aspect_ratio || .6875),metres=p=>[p[0]*width/100,p[1]*depth/100];
  let x,z,nx,nz,height=2.4;
  if(m.kind==='corner'){
    const room=floor.rooms.find(r=>r.id===m.room_id),p=room?.points[m.corner];if(!p)throw Error('Choose a room corner for the sensor');
    [x,z]=metres(p);const centre=room.points.reduce((v,p)=>[v[0]+p[0]*width/100/room.points.length,v[1]+p[1]*depth/100/room.points.length],[0,0]);
    nx=centre[0]-x;nz=centre[1]-z;height=Math.max(2.4,...(floor.walls || []).map(w=>w.height || 2.4));
  }else if(m.kind==='wall'){
    const wall=floor.walls.find(w=>w.id===m.wall_id);if(!wall||!Number.isFinite(m.offset)||m.offset<0||m.offset>1||![-1,1].includes(m.side))throw Error('Choose a wall, side and position for the sensor');
    const a=metres(wall.a),b=metres(wall.b);x=a[0]+(b[0]-a[0])*m.offset;z=a[1]+(b[1]-a[1])*m.offset;nx=-(b[1]-a[1])*m.side;nz=(b[0]-a[0])*m.side;height=wall.height || 2.4;
    const length=Math.hypot(nx,nz);if(length){x+=nx/length*(wall.thickness || .15)/2;z+=nz/length*(wall.thickness || .15)/2;}
  }else throw Error('Choose wall or room corner mounting');
  const length=Math.hypot(nx,nz);if(!length)throw Error('Sensor mount needs a direction');nx/=length;nz/=length;
  const gap=m.kind==='corner'?Math.max(item.width,item.depth)*.9:item.depth/2+.015;
  return {x:Math.max(0,Math.min(100,(x+nx*gap)/width*100)),y:Math.max(0,Math.min(100,(z+nz*gap)/depth*100)),rotation:((-Math.atan2(nx,nz)*180/Math.PI)%360+360)%360,elevation_m:m.kind==='corner'?Math.max(0,height-item.height-.08):Math.min(item.elevation_m??1.8,Math.max(0,height-item.height))};
}
