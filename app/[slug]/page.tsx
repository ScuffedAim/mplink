'use client';

import { useEffect, useState } from 'react';

interface BeatmapInfo {
  md5: string;
  id: number;
  set_id: number;
  artist: string;
  title: string;
  version: string;
  creator: string;
  last_update: string;
  total_length: number;
  max_combo: number;
  status: number;
  plays: number;
  passes: number;
  mode: number;
  bpm: number;
  cs: number;
  od: number;
  ar: number;
  hp: number;
  diff: number;
}

interface UserInfo {
  id: number;
  name: string;
  safe_name: string;
  priv: number;
  country: string;
  silence_end: number;
  donor_end: number;
  creation_time: number;
  latest_activity: number;
  clan_id: number;
  clan_priv: number;
  preferred_mode: number;
  play_style: number;
  custom_badge_name: string | null;
  custom_badge_icon: string | null;
  userpage_content: string | null;
}

interface Score {
  id: number;
  map_md5: string;
  score: number;
  pp: number;
  acc: number;
  max_combo: number;
  mods: number;
  n300: number;
  n100: number;
  n50: number;
  nmiss: number;
  ngeki: number;
  nkatu: number;
  grade: string;
  status: number;
  mode: number;
  play_time: string;
  time_elapsed: number;
  client_flags: number;
  userid: number;
  perfect: number;
  online_checksum: string;
  match_id: number;
}

interface ModFlags {
  [key: number]: {
    name: string;
    icon: string;
  };
}

const MODS: ModFlags = {
  1: { name: "NoFail", icon: "NF" },
  2: { name: "Easy", icon: "EZ" },
  4: { name: "TouchDevice", icon: "TD" },
  8: { name: "Hidden", icon: "HD" },
  16: { name: "HardRock", icon: "HR" },
  32: { name: "SuddenDeath", icon: "SD" },
  64: { name: "DoubleTime", icon: "DT" },
  128: { name: "Relax", icon: "RX" },
  256: { name: "HalfTime", icon: "HT" },
  512: { name: "Nightcore", icon: "NC" },
  1024: { name: "Flashlight", icon: "FL" },
  2048: { name: "Autoplay", icon: "AT" },
  4096: { name: "SpunOut", icon: "SO" },
  8192: { name: "Relax2", icon: "AP" },
  16384: { name: "Perfect", icon: "PF" },
};

function getModsFromFlags(flags: number): string[] {
  return Object.entries(MODS)
    .filter(([flag]) => (flags & parseInt(flag)) !== 0)
    .map(([, mod]) => mod.icon);
}

async function getmap_by_hash(map_md5: string): Promise<BeatmapInfo> {
    const data = await fetch("https://api.scuffedaim.xyz/v1/get_map_info?md5=" + map_md5, {
      next: { revalidate: 5 }
    });
    const json = await data.json()
    return json.map
}

async function getuser_by_id(uid: number): Promise<UserInfo> {
    const data = await fetch("https://api.scuffedaim.xyz/v2/players/" + uid, {
      next: { revalidate: 5 }
    });
    const json = await data.json();
    return json.data;
}

function ScoresDisplay({ initialScores, initialMapInfo, initialUserInfo, slug }: {
  initialScores: { data: Score[] };
  initialMapInfo: {[key: string]: BeatmapInfo};
  initialUserInfo: {[key: number]: UserInfo};
  slug: string;
}) {
  const [, setScores] = useState(initialScores);
  const [mapInfoByHash, setMapInfoByHash] = useState(initialMapInfo);
  const [userInfoById, setUserInfoById] = useState(initialUserInfo);
  
  // Initialize scoresByMap with the initial scores
  const initialGroupedScores = initialScores.data.reduce((acc: { [key: string]: Score[] }, score: Score) => {
    const map = initialMapInfo[score.map_md5];
    const TIME_THRESHOLD = (map?.total_length || 5) * 1000 + 2000;
    const playTime = new Date(score.play_time).getTime();
    
    let foundGroup = false;
    
    Object.entries(acc).forEach(([key, groupScores]) => {
      if (key.startsWith(score.map_md5)) {
        const groupTime = new Date(groupScores[0].play_time).getTime();
        if (Math.abs(playTime - groupTime) <= TIME_THRESHOLD) {
          groupScores.push(score);
          foundGroup = true;
        }
      }
    });
    
    if (!foundGroup) {
      const newKey = `${score.map_md5}_${score.play_time}`;
      acc[newKey] = [score];
    }
    
    return acc;
  }, {});

  // Sort initial scores
  Object.values(initialGroupedScores).forEach((scores) => {
    (scores as Score[]).sort((a, b) => 
      new Date(a.play_time).getTime() - new Date(b.play_time).getTime()
    );
  });

  const [scoresByMap, setScoresByMap] = useState<{[key: string]: Score[]}>(initialGroupedScores);

  useEffect(() => {
    function fetchLatestData() {
      fetch(`https://api.scuffedaim.xyz/v2/scores/match/${slug}`)
        .then(r => r.json())
        .then(newScores => {
          // Fetch new map info if needed
          const newMapHashes = [...new Set(newScores.data.map((score: Score) => score.map_md5))] as string[];
          const newMapHashesOnly = newMapHashes.filter(hash => !mapInfoByHash[hash as keyof typeof mapInfoByHash]);
          
          let mapPromise = Promise.resolve();
          if (newMapHashesOnly.length > 0) {
            mapPromise = Promise.all(
              newMapHashesOnly.map(hash => 
                fetch(`https://api.scuffedaim.xyz/v1/get_map_info?md5=${hash}`)
                  .then(r => r.json())
                  .then(info => ({ hash, info }))
              )
            ).then(newMapInfo => {
              const newMapInfoByHash = { ...mapInfoByHash };
              newMapInfo.forEach(({ hash, info }) => {
                newMapInfoByHash[hash] = info.map;
              });
              setMapInfoByHash(newMapInfoByHash);
            });
          }

          // Fetch new user info if needed
          const newUserIds = [...new Set(newScores.data.map((score: Score) => score.userid))];
          const newUserIdsOnly = newUserIds.filter(id => !userInfoById[id as keyof typeof userInfoById]);

          let userPromise = Promise.resolve();
          if (newUserIdsOnly.length > 0) {
            userPromise = Promise.all(
              newUserIdsOnly.map(uid => 
                fetch(`https://api.scuffedaim.xyz/v2/players/${uid}`)
                  .then(r => r.json())
                  .then(info => ({ uid, info }))
              )
            ).then(newUserInfo => {
              const newUserInfoById = { ...userInfoById };
              newUserInfo.forEach(({ uid, info }) => {
                newUserInfoById[uid as keyof typeof userInfoById] = info.data;
              });
              setUserInfoById(newUserInfoById);
            });
          }

          // After both map and user info are updated
          Promise.all([mapPromise, userPromise]).then(() => {
            setScores(newScores);
            
            // Group and sort scores
            const groupedScores = newScores.data.reduce((acc: { [key: string]: Score[] }, score: Score) => {
              const map = mapInfoByHash[score.map_md5];
              const TIME_THRESHOLD = (map?.total_length || 5) * 1000 + 2000;
              const playTime = new Date(score.play_time).getTime();
              
              let foundGroup = false;
              
              Object.entries(acc).forEach(([key, groupScores]) => {
                if (key.startsWith(score.map_md5)) {
                  const groupTime = new Date(groupScores[0].play_time).getTime();
                  if (Math.abs(playTime - groupTime) <= TIME_THRESHOLD) {
                    groupScores.push(score);
                    foundGroup = true;
                  }
                }
              });
              
              if (!foundGroup) {
                const newKey = `${score.map_md5}_${score.play_time}`;
                acc[newKey] = [score];
              }
              
              return acc;
            }, {});

            (Object.values(groupedScores) as Score[][]).forEach(scores => {
              scores.sort((a, b) => 
                new Date(a.play_time).getTime() - new Date(b.play_time).getTime()
              );
            });

            setScoresByMap(groupedScores);
          });
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });
    }

    // Initial fetch
    fetchLatestData();

    // Set up polling
    const interval = setInterval(fetchLatestData, 5000);
    return () => clearInterval(interval);
  }, [slug, mapInfoByHash, userInfoById]);

  return (
    <div className="p-4 rounded-lg">
      {Object.entries(scoresByMap).map(([mapKey, mapScores]: [string, Score[]], index) => {
        const mapHash = mapKey.split('_')[0];
        const map = mapInfoByHash[mapHash];
        const firstScoreTime = new Date(mapScores[0].play_time);
        return (
          <div key={mapKey} className="mb-8 bg-slate-700 p-3">
            <div className="flex flex-col gap-4 bg-slate-800 p-3 rounded">
              <h2 className="text-violet-400 text-xl">
                {map ? `${map.artist} - ${map.title} [${map.version}]` : `Map #${index + 1}`}
                <span className="text-sm ml-4 text-violet-300">
                  {firstScoreTime.toLocaleTimeString()}
                </span>
              </h2>
              <div className="flex gap-4">
                <img 
                  src={`https://assets.ppy.sh/beatmaps/${map?.set_id}/covers/cover.jpg`}
                  className={`w-[400px] object-cover rounded-md`}
                  style={{
                    height: `${Math.max(100, Math.min(400, mapScores.length * 80))}px`
                  }}
                  alt={map ? `${map.title} cover` : "Beatmap cover"} />
                
                <div className="flex-1 grid gap-1">
                  {(mapScores as Score[]).map((score, scoreIndex) => {
                    const user = userInfoById[score.userid];
                    return (
                      <div key={scoreIndex}>
                        <div className="flex justify-between items-center">
                          <div className="text-violet-300">
                            <span className="font-bold text-pink-300">
                              {user?.country ? String.fromCodePoint(
                                ...user.country.toUpperCase().split('').map(
                                  char => char.charCodeAt(0) + 127397
                                )
                              ) : '🏳️'}{' '}
                              {user?.name || 'Unknown Player'}
                            </span>
                            {getModsFromFlags(score.mods).map(mod => (
                              <span key={mod} className="inline-block bg-violet-700 text-white text-xs font-bold px-1.5 rounded ml-1">
                                {mod}
                              </span>
                            ))}
                          </div>
                          <div className="text-right">
                            <div className="text-violet-300">
                              <span className="text-xl font-bold">{score.score.toLocaleString()}</span>
                              <span className="text-sm ml-2">{score.acc.toFixed(2)}%</span>
                            </div>
                            <div className="text-violet-200 text-sm">
                              <span title="Max Combo">{score.max_combo}x</span> • 
                              <span className="text-blue-300" title="300">{score.n300}</span>/
                              <span className="text-green-300" title="100">{score.n100}</span>/
                              <span className="text-yellow-300" title="50">{score.n50}</span>/
                              <span className="text-red-400" title="Miss">{score.nmiss}</span>
                            </div>
                          </div>
                        </div>
                        {scoreIndex < mapScores.length - 1 && (
                          <hr className="my-1 border-violet-600/30 md:hidden" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function Page({
    params,
  }: {
    params: Promise<{ slug: string }>
  }) 
  {
    const slug = (await params).slug
    
    // Initial data fetch
    const scoresRes = await fetch(`https://api.scuffedaim.xyz/v2/scores/match/${slug}`);
    const scores = await scoresRes.json();
    // Get initial map info
    const uniqueMapHashes = [...new Set(scores.data.map((score: Score) => score.map_md5))] as string[];
    const mapInfo = await Promise.all(
      uniqueMapHashes.map((hash: string) => getmap_by_hash(hash))
    );
    const mapInfoByHash = Object.fromEntries(
      mapInfo.map(map => [map.md5, map])
    );

    // Get initial user info
    const uniqueUserIds = [...new Set(scores.data.map((score: Score) => score.userid))] as number[];
    const userInfo = await Promise.all(
      uniqueUserIds.map(uid => getuser_by_id(uid))
    );
    const userInfoById = Object.fromEntries(
      userInfo.map(user => [user.id, user])
    );

    return (
      <div>
        <div className="text-pink-300 text-3xl text-center font-mono p-5 bg-slate-600">
          Match data for match {slug}:
        </div>
        <ScoresDisplay 
          initialScores={scores}
          initialMapInfo={mapInfoByHash}
          initialUserInfo={userInfoById}
          slug={slug}
        />
      </div>
    )
}

