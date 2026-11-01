// CJ LIVE — mod para GTA V Legacy (ScriptHookV + ScriptHookVDotNet 3).
// Criado por AjKaBaL. Pode usar e modificar à vontade; só mantenha os créditos.

// Conecta no index.js (ws://localhost:8080) e executa no jogo as ações dos presentes,
// as reações e a boca mexendo enquanto o CJ fala.
//
// Instalação: o "Ligar CJ LIVE" copia sozinho para <GTA>\scripts\CjLive.3.cs (o ".3" = API v3 do SHVDN)
// Teclas: F7 = câmera da live | F8 = piloto automático | F9 = testa a próxima ação | F10 = status
// Provador: End = próxima parte do corpo (Shift+End volta) | PageUp/PageDown = troca a peça |
//           Delete = troca a cor | F6 = tira chapéu/óculos | F5 = salva a roupa (vestida ao abrir o jogo)
//
// Piloto automático: o CJ anda e dirige sozinho pelo mapa; quando chega uma ação ele executa
// e depois volta a passear. Feito para a live rodar sem ninguém jogando.
//
// Escrito em C# 5 (sem $"", ?. etc.) porque o ScriptHookVDotNet compila o .cs com o compilador antigo.

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using GTA;
using GTA.Math;
using GTA.Native;

public class CjLive : Script
{
    const string ServerUrl = "ws://localhost:8080";

    // ---- Personagem ----
    // Nome do modelo add-on do CJ (ex.: "cj"). Vazio = mantém o personagem atual.
    // O mod reaplica o modelo sozinho se o jogo trocar (morte, troca de personagem...).
    // Modelo do F11. Vazio = não troca: o Franklin já vira o CJ pelo pacote
    // CJ-LIVE-Franklin-vira-CJ.oiv (gta-mod/cj-ped/build-franklin-oiv.js).
    const string PlayerModel = "";

    // ---- Ajustes do piloto automático ----
    const bool StartWithAutopilot = false;    // liga com F8
    const bool AlwaysInvincible = true;   // a live não para porque o CJ morreu
    const bool NoPolice = true;           // sem estrelas de procurado (a polícia atrapalharia o passeio)
    const int FootMinutes = 8;            // tempo passeando a pé em cada bairro (~80% do tempo a pé)
    const int CruiseMinutes = 2;          // passeio de carro "livre", quando sorteado
    const float WalkToCarDistance = 350f; // bairro mais longe que isso: vai de carro
    const float DriveSpeed = 16f;         // m/s (~58 km/h)
    const int DrivingStyle = 786495;      // desvia de carros/pedestres e NÃO para em semáforo
    const int RushedStyle = 1074528293;   // modo "apressado" quando fica preso no trânsito
    const int StuckRushSeconds = 6;       // parado esse tempo no carro: fica apressado
    const int StuckAbandonSeconds = 15;   // parado esse tempo: abandona o carro e segue a pé

    // Bairros onde ele passa a maior parte do tempo (peso = chance de ser sorteado)
    // e as atividades que ele faz de vez em quando em cada um (cenários do próprio GTA).
    static readonly Zone[] Zones =
    {
        new Zone("Centro (Legion Square)", 195f, -935f, 30f, 420f, 35,
            "WORLD_HUMAN_STAND_MOBILE", "WORLD_HUMAN_MOBILE_FILM_SHOCKING", "WORLD_HUMAN_STAND_IMPATIENT", "WORLD_HUMAN_LEANING"),
        new Zone("Grove Street", 115f, -1935f, 21f, 230f, 25,
            "WORLD_HUMAN_HANG_OUT_STREET", "WORLD_HUMAN_LEANING", "WORLD_HUMAN_GUARD_STAND", "WORLD_HUMAN_PUSH_UPS"),
        new Zone("Vinewood", 250f, 195f, 105f, 320f, 15,
            "WORLD_HUMAN_TOURIST_MOBILE", "WORLD_HUMAN_TOURIST_MAP", "WORLD_HUMAN_MUSICIAN", "WORLD_HUMAN_STAND_MOBILE"),
        new Zone("Praia de Vespucci / Muscle Beach", -1225f, -1545f, 4f, 320f, 15,
            "WORLD_HUMAN_MUSCLE_FREE_WEIGHTS", "WORLD_HUMAN_MUSCLE_FLEX", "WORLD_HUMAN_PUSH_UPS", "WORLD_HUMAN_SIT_UPS",
            "WORLD_HUMAN_YOGA", "WORLD_HUMAN_JOG_STANDING"),
        new Zone("Píer de Del Perro", -1715f, -1105f, 13f, 140f, 10,
            "WORLD_HUMAN_STAND_FISHING", "WORLD_HUMAN_TOURIST_MOBILE", "WORLD_HUMAN_LEANING", "WORLD_HUMAN_DRINKING"),
        new Zone(null, 0f, 0f, 0f, 0f, 10), // null = passeio livre de carro pelo mapa
    };
    const int ActivityMinSeconds = 50;    // intervalo entre uma atividade e outra (sorteado entre min e max)
    const int ActivityMaxSeconds = 110;
    const int ActivityDurationSeconds = 18;

    class Zone
    {
        public readonly string Name;
        public readonly Vector3 Center;
        public readonly float Radius;
        public readonly int Weight;
        public readonly string[] Activities;
        public Zone(string name, float x, float y, float z, float radius, int weight, params string[] activities)
        {
            Name = name; Center = new Vector3(x, y, z); Radius = radius; Weight = weight; Activities = activities;
        }
    }

    // ---- Câmera da live (na frente do CJ, olhando para o rosto) ----
    const bool StartWithLiveCamera = false;   // liga com F7
    const bool HideHud = true;            // esconde radar e HUD
    const float CamFootDistance = 3.2f;   // distância à frente quando a pé
    const float CamTalkDistance = 2.1f;   // chega mais perto enquanto ele fala
    const float CamCarDistance = 7.5f;    // distância à frente do carro
    const int CarCloseEverySeconds = 20;  // no carro: de tempos em tempos corta para o rosto dele
    const int CarCloseSeconds = 7;        // ...por esse tempo (e sempre enquanto ele fala)
    const float CamSmooth = 0.06f;        // 0..1: menor = câmera mais suave
    const float CamFov = 50f;

    // Natives chamadas pelo hash (não dependem do nome que a versão do SHVDN usa)
    const ulong REQUEST_ANIM_DICT = 0xD3BD40951412FEF6;
    const ulong HAS_ANIM_DICT_LOADED = 0xD031A9162D01088C;
    const ulong TASK_PLAY_ANIM = 0xEA47FE3719165B94;
    const ulong TASK_START_SCENARIO_IN_PLACE = 0x142A02425FF02BD9;
    const ulong CLEAR_PED_TASKS = 0xE1EF3C1216AFF2CD;
    const ulong SET_PED_DEFAULT_COMPONENT_VARIATION = 0x45EEE61580806D63;
    const ulong SET_PED_COMPONENT_VARIATION = 0x262B14F48D29DE80;
    const ulong GET_PED_DRAWABLE_VARIATION = 0x67F3780DD425D4FC;
    const ulong GET_PED_TEXTURE_VARIATION = 0x04A355E041E004E6;
    const ulong GET_NUMBER_OF_PED_DRAWABLE_VARIATIONS = 0x27561561732A7842;
    const ulong GET_NUMBER_OF_PED_TEXTURE_VARIATIONS = 0x8F7156A3142A6BAD;
    const ulong CLEAR_ALL_PED_PROPS = 0xCD8A7537A9B52F06;
    const ulong CLEAR_PED_TASKS_IMMEDIATELY = 0xAAA34F8A7CB32098;
    const ulong SET_FACIAL_IDLE_ANIM_OVERRIDE = 0xFFC24B988B938B38;
    const ulong CLEAR_FACIAL_IDLE_ANIM_OVERRIDE = 0x726256CC1EEB182F;
    const ulong ADD_EXPLOSION = 0xE3AD2BDBAEE269AC;
    const ulong SET_WEATHER_TYPE_OVERTIME_PERSIST = 0xFB5045B7C42B75BF;
    const ulong SET_ENTITY_INVINCIBLE = 0x3882114BDE571AD4;
    const ulong GIVE_WEAPON_TO_PED = 0xBF0FD6E56C964FCB;
    const ulong SET_VEHICLE_MOD_KIT = 0x1F2AA07F00B3217A;
    const ulong GET_NUM_VEHICLE_MODS = 0xE38E9162A2500646;
    const ulong SET_VEHICLE_MOD = 0x6AF0636DDEDCB6DD;
    const ulong SET_VEHICLE_NEON_ENABLED = 0x2AA720E4287BF269;
    const ulong SET_VEHICLE_NEON_COLOUR = 0x8E0A582209A62695;
    const ulong SET_VEHICLE_CUSTOM_PRIMARY_COLOUR = 0x7141766F91D15BEA;
    const ulong SET_PED_INTO_VEHICLE = 0xF75B0D629E1C063D;
    const ulong SET_PED_HELMET = 0x560A43136EB58105;
    const ulong TASK_COMBAT_PED = 0xF166E48407BAC484;
    const ulong TASK_WANDER_STANDARD = 0xBB9CE077274F6A1B;
    const ulong TASK_VEHICLE_DRIVE_WANDER = 0x480142959D337D00;
    const ulong TASK_ENTER_VEHICLE = 0xC20E50AA46D09CA8;
    const ulong TASK_FOLLOW_NAV_MESH_TO_COORD = 0x15D3A79D4E44B913;
    const ulong TASK_VEHICLE_DRIVE_TO_COORD_LONGRANGE = 0x158BB33F920D360C;
    const ulong TASK_LEAVE_VEHICLE = 0xD3DBCE61A490BE02;
    const ulong INVALIDATE_IDLE_CAM = 0xF4F2C0D4EE209E20;
    const ulong INVALIDATE_CINEMATIC_VEHICLE_IDLE_MODE = 0x9E4CFFF989258472;
    const ulong SET_MAX_WANTED_LEVEL = 0xAA5F02DB48D704B9;
    const ulong HIDE_HUD_AND_RADAR_THIS_FRAME = 0x719FF505F097FD20;
    const ulong THEFEED_HIDE_THIS_FRAME = 0x25F87B30C382FCA7;
    const ulong CLEAR_ALL_HELP_MESSAGES = 0x6178F68A87A4D3A0;

    const ulong GET_PED_BONE_COORDS = 0x17C07FC640E86B4E;
    const ulong SET_CLOCK_TIME = 0x47C3B5848C3E45D8;
    const ulong GET_CLOCK_HOURS = 0x25223CA6B4D20B7F;
    const ulong GET_PED_GROUP_INDEX = 0xF162E133B4E7A675;
    const ulong SET_PED_AS_GROUP_MEMBER = 0x9F3480FE65DB31B5;
    const ulong REMOVE_PED_FROM_GROUP = 0xED74007FFB146BC2;
    const ulong SET_PED_RELATIONSHIP_GROUP_HASH = 0xC80A74AC829DDD92;
    const ulong CREATE_AMBIENT_PICKUP = 0x673966A0C0FD7171;
    const ulong TASK_COMBAT_HATED_TARGETS_AROUND_PED = 0x7BF835BB9E2698C8;
    const ulong TASK_SMART_FLEE_COORD = 0x94587F17E9C365D5;
    const ulong IS_EXPLOSION_IN_SPHERE = 0xAB0F816885B0E483;
    const ulong HAS_ENTITY_BEEN_DAMAGED_BY_ANY_PED = 0x605F5A140F202491;
    const ulong CLEAR_ENTITY_LAST_DAMAGE_ENTITY = 0xA72CD9CA74A5ECBA;
    const ulong IS_PED_SHOOTING = 0x34616828CD07F1A1;
    const ulong SET_CURRENT_PED_WEAPON = 0xADF692B254977C0C;
    const ulong SET_PLAYER_INVINCIBLE = 0x239528EACDC3E7DE;
    const ulong SET_PED_CAN_BE_DRAGGED_OUT = 0xC1670E958EEE24E5;
    const ulong SET_PED_CAN_BE_KNOCKED_OFF_VEHICLE = 0x7A6535691B477C48;
    const ulong SET_PED_SUFFERS_CRITICAL_HITS = 0xEBD76F2359F190AC;
    const ulong CLEAR_PED_BLOOD_DAMAGE = 0x8FE22675A5A45817;
    const ulong SET_VEHICLE_FIXED = 0x115722B1B9C14C1C;
    const ulong SET_VEHICLE_DIRT_LEVEL = 0x79D3B596FE44EE8B;
    const ulong HAS_ENTITY_BEEN_DAMAGED_BY_ENTITY = 0xC86D67D52A707CF8;
    const ulong IS_PED_IN_COMBAT = 0x4859F1FC66A6278E;
    const ulong SET_GRAVITY_LEVEL = 0x740E14FAD5842351;
    const ulong SET_TIME_SCALE = 0x1D408577D440E81E;
    const ulong SET_TIMECYCLE_MODIFIER = 0x2C933ABF17A1DF41;
    const ulong CLEAR_TIMECYCLE_MODIFIER = 0x0F07E7745A236711;
    const ulong REQUEST_ANIM_SET = 0x6EA47DAE7FAD0EED;
    const ulong HAS_ANIM_SET_LOADED = 0xC4EA073D86FB29B0;
    const ulong SET_PED_MOVEMENT_CLIPSET = 0xAF8A94EDE7712BEF;
    const ulong RESET_PED_MOVEMENT_CLIPSET = 0xAA74EC0CB0AAEA2C;
    const ulong SET_PED_IS_DRUNK = 0x95D2D383D5396B8A;
    const ulong SHAKE_CAM = 0x6A25241C340D3822;
    const ulong IS_CAM_SHAKING = 0x6B24BFE83A2BE47B;
    const ulong STOP_CAM_SHAKING = 0xBDECF64367884AC3;
    const ulong SHAKE_GAMEPLAY_CAM = 0xFD55E49555E017CF;
    const ulong STOP_GAMEPLAY_CAM_SHAKING = 0x0EF93E9F3D08C178;
    const ulong SET_PED_TO_RAGDOLL = 0xAE99FB955581844A;
    const ulong IS_THIS_MODEL_A_BIKE = 0xB50C0B0CEDC6CE84;
    const ulong IS_THIS_MODEL_A_BICYCLE = 0xBF94DD42F63BDED2;
    const ulong IS_THIS_MODEL_A_QUADBIKE = 0x39DAC362EE65FA28;
    const ulong GET_ENTITY_PITCH = 0xD45DC2893621E1FE;
    const ulong APPLY_FORCE_TO_ENTITY = 0xC5F68BE9613E2D18;
    const ulong PLAY_FACIAL_ANIM = 0xE1E65CA8AC9C00ED;
    const ulong ATTACH_CAM_TO_ENTITY = 0xFEDB7D269E8C60E3;
    const ulong DETACH_CAM = 0xA2FABBE87F4BAD82;
    const ulong POINT_CAM_AT_ENTITY = 0x5640BFF86B16E8DC;
    const ulong POINT_CAM_AT_PED_BONE = 0x68B2B5F33BA63C41;
    const ulong STOP_CAM_POINTING = 0xF33AB75780BA57DE;
    const ulong GET_OFFSET_FROM_ENTITY_GIVEN_WORLD_COORDS = 0x2274BC1C4885E333;
    const ulong TASK_FOLLOW_TO_OFFSET_OF_ENTITY = 0x304AE42E357B8C7E;
    const ulong SET_VEHICLE_COLOURS = 0x4F1D4BE3A7F24601;
    const ulong SET_VEHICLE_OUT_OF_CONTROL = 0xF19D095E42D430CC;
    const ulong SET_VEHICLE_ENGINE_HEALTH = 0x45F6D8EEF34ABEF1;
    const ulong SET_VEHICLE_ENGINE_ON = 0x2497C4717C8B881E;
    const ulong ADD_TO_CLOCK_TIME = 0xD716F30D8C8980E2;
    const ulong TASK_VEHICLE_TEMP_ACTION = 0xC429DCEEB339E129;
    const ulong PLAY_PED_AMBIENT_SPEECH_NATIVE = 0xC6941B4A3A8FBBB9;
    const ulong SET_VEHICLE_FORWARD_SPEED = 0xAB54A438726D25D5;
    const ulong TASK_SHOOT_AT_ENTITY = 0x08DA95E8298AE772;
    const ulong TASK_SHOOT_AT_COORD = 0x46A6CC01E0826106;
    const ulong IS_PED_HUMAN = 0xB980061DA992779D;
    const ulong GET_PED_TYPE = 0xFF059E1E4C01E63C;
    const uint FIRING_PATTERN_FULL_AUTO = 0xC6EE6B4C;
    const uint WEAPON_UNARMED = 0xA2719263;
    const int BONE_HEAD = 31086;
    const uint PARACHUTE = 0xFBAB5776;
    const uint WEAPON_PISTOL = 0x1B06D571;
    const uint WEAPON_AK = 0xBFEFFF6D;       // fuzil de assalto (a AK do GTA)
    const uint WEAPON_MICROSMG = 0x13532244;
    const uint PICKUP_MONEY_VARIABLE = 0xEA888D49;
    const int EXPLOSION_GRENADE = 0;
    const int EXPLOSION_FIREWORK = 38;

    static readonly string[] TestActions =
    {
        "aplaudir", "dancar", "acenar", "flexionar", "noite", "bmx", "chuva_dinheiro", "grove_aliados",
        "tempestade", "voar", "ballas", "policia", "queda_livre", "fogos", "carro_tunado", "explodir_tudo", "pumas", "tanque",
        "moto", "academia", "pier", "empinar", "neve", "bebado", "camera_lenta", "lua", "palhacos", "chuva_vacas",
        "chuva_carros", "tornado", "queda_aviao", "maluquice", "andar_trevor", "furia_trevor",
        "zerinho", "rampa", "vandalismo", "briga", "tiro_pro_alto", "corrida",
        "ir_grove", "ir_praia", "ir_vinewood", "ir_centro"
    };

    // Animações engraçadas (dicionário anim@mp_player_intcelebrationmale@<nome>, clipe <nome>)
    static readonly string[] FunnyEmotes =
    {
        "chicken_taunt", "air_guitar", "jazz_hands", "karate_chops", "freakout", "thumb_on_ears", "uncle_disco",
        "raise_the_roof", "slow_clap", "nose_pick", "cry_baby", "find_the_fish", "banging_tunes", "oh_snap",
        "surrender", "the_woogie", "dj", "air_synth", "chin_brush", "knuckle_crunch", "rock"
    };
    const double FunnyEmoteChance = 0.3;  // no bairro, chance de uma palhaçada no lugar da atividade normal

    // ---- Atitudes "de jogador": de tempos em tempos ele faz algo por conta própria, como alguém jogando ----
    // De carro: zerinho, cantar pneu, pular rampa. A pé: briga com pedestre, destrói um carro, tiro pro alto, corrida.
    const int HumanMinSeconds = 45;
    const int HumanMaxSeconds = 120;
    int nextHumanAt;

    // Noite mais curta: das 21h às 5h o relógio corre bem mais rápido (a live fica mais tempo de dia)
    const int NightStartHour = 21;
    const int NightEndHour = 5;
    const int NightExtraMinutesPerSecond = 3;  // normal do jogo: meio minuto por segundo
    int nightForcedUntil;                      // ação "noite": deixa a noite em paz por um tempo

    // Oficinas de pintura (LS Customs / Beeker's): fugindo da polícia de carro, ele vai até a mais perto,
    // pinta o carro e as estrelas somem
    static readonly Vector3[] PaintShops =
    {
        new Vector3(-337.4f, -136.9f, 39.0f),   // Burton
        new Vector3(-1155.5f, -2006.3f, 13.2f), // aeroporto
        new Vector3(731.6f, -1088.9f, 22.2f),   // La Mesa
        new Vector3(1175.0f, 2640.0f, 37.8f),   // Harmony
        new Vector3(110.9f, 6626.4f, 31.8f),    // Paleto Bay
    };
    const float PaintShopMaxDistance = 1500f;

    // ---- Empinar: de moto, bicicleta ou quadriciclo, de vez em quando ele levanta a frente ----
    const double WheelieChance = 0.5;     // chance a cada sorteio
    const int WheelieMinSeconds = 12;     // intervalo entre sorteios
    const int WheelieMaxSeconds = 30;
    const float WheeliePitch = 22f;       // ângulo alvo (graus); passou disso, para de levantar
    const float WheelieForce = 0.35f;     // força para levantar a frente (aumente se não empinar, diminua se capotar)
    int wheelieUntil;
    int nextWheelieAt;
    int wheelieBoostUntil;                // ação "empinar": empina bem mais vezes por um tempo

    // ---- Efeitos com duração (presentes malucos) ----
    int gravityUntil, nextMoonJumpAt;
    int drunkUntil;
    int slowUntilReal;                    // câmera lenta: conta em tempo real (o tempo do jogo fica lento)
    int snowUntil;
    int nextEffectCheck;

    readonly ConcurrentQueue<string> inbox = new ConcurrentQueue<string>();
    readonly ConcurrentQueue<string> outbox = new ConcurrentQueue<string>(); // eventos do jogo -> index.js
    readonly CancellationTokenSource stop = new CancellationTokenSource();
    readonly Random rng = new Random();
    volatile bool connected;
    bool talking;
    int talkUntil;
    int nextFacialAt;
    int invincibleUntil;
    int scenarioUntil;
    int testIndex;
    bool creditShown;

    bool autopilot = StartWithAutopilot;
    int busyUntil;        // enquanto uma ação roda, o piloto automático espera
    int nextCheck;
    int stillSince;
    int enteringUntil;
    Zone zone;            // bairro atual (Name == null: passeio livre de carro)
    int zoneUntil;        // hora de sortear o próximo bairro
    bool walkingBack;     // voltando a pé para dentro do bairro
    int lastNavAt;
    int carCooldownUntil; // depois de abandonar um carro, espera antes de pegar outro
    bool driveTaskIssued;
    bool rushed;
    int nextActivityAt;
    string pendingAction; // ação esperando o CJ descer do carro
    int pendingAt;

    bool liveCamera = StartWithLiveCamera;
    Camera cam;
    Vector3 camPos;
    float camDistance = CamFootDistance;
    float camYaw;

    public CjLive()
    {
        Interval = 0;
        Tick += OnTick;
        KeyDown += OnKeyDown;
        Aborted += OnAborted;
        Task.Run(() => SocketLoop());
    }

    // ---------- Conexão (thread separada; o jogo só é tocado no Tick) ----------

    async Task SocketLoop()
    {
        while (!stop.IsCancellationRequested)
        {
            using (var ws = new ClientWebSocket())
            {
                try
                {
                    await ws.ConnectAsync(new Uri(ServerUrl), stop.Token);
                    connected = true;
                    inbox.Enqueue("{\"type\":\"_status\"}");
                    var buffer = new byte[16384];
                    var message = new StringBuilder();
                    string ignored;
                    while (outbox.TryDequeue(out ignored)) { } // eventos antigos não fazem mais sentido
                    var sending = SendLoop(ws);
                    while (ws.State == WebSocketState.Open)
                    {
                        var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), stop.Token);
                        if (result.MessageType == WebSocketMessageType.Close) break;
                        message.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                        if (result.EndOfMessage)
                        {
                            inbox.Enqueue(message.ToString());
                            message.Clear();
                        }
                    }
                }
                catch (Exception)
                {
                    // servidor desligado: tenta de novo abaixo
                }
            }
            if (connected)
            {
                connected = false;
                inbox.Enqueue("{\"type\":\"_status\"}");
            }
            try { await Task.Delay(3000, stop.Token); } catch (Exception) { }
        }
    }

    async Task SendLoop(ClientWebSocket ws)
    {
        try
        {
            while (ws.State == WebSocketState.Open && !stop.IsCancellationRequested)
            {
                string msg;
                if (outbox.TryDequeue(out msg))
                {
                    byte[] data = Encoding.UTF8.GetBytes(msg);
                    await ws.SendAsync(new ArraySegment<byte>(data), WebSocketMessageType.Text, true, stop.Token);
                }
                else await Task.Delay(100, stop.Token);
            }
        }
        catch (Exception) { }
    }

    void OnAborted(object sender, EventArgs e)
    {
        stop.Cancel();
        ResetEffects();
        StopTalking();
        DestroyLiveCamera();
    }

    // ---------- Loop do jogo ----------

    void OnTick(object sender, EventArgs e)
    {
        string raw;
        int handled = 0;
        while (handled < 5 && inbox.TryDequeue(out raw))
        {
            handled++;
            try { Handle(raw); }
            catch (Exception ex) { GTA.UI.Notification.Show("~r~CJ LIVE erro: ~w~" + ex.Message); }
        }

        int now = Game.GameTime;
        if (!creditShown && now > 4000)
        {
            creditShown = true;
            GTA.UI.Notification.Show("~g~CJ LIVE~w~ por ~y~AjKaBaL~w~ — F7 câmera, F8 piloto automático");
        }
        if (!outfitLoaded && now > 3000 && !Player.IsDead)
        {
            outfitLoaded = true;
            LoadOutfit();
        }
        KeepOutfit(now);
        if (crew.Count > 0 && now > crewUntil) ReleaseCrew();
        if (now >= nextReactCheck)
        {
            nextReactCheck = now + 500;
            ReactStep(now);
        }
        // Segurança: se o "speak_end" se perder, fecha a boca sozinho
        if (talking && now > talkUntil) StopTalking();
        TalkGestureStep(now);
        // Algumas ações (entrar no carro, cenários) apagam a animação do rosto: repete enquanto fala
        if (talking && now >= nextFacialAt)
        {
            nextFacialAt = now + 1500;
            Function.Call((Hash)PLAY_FACIAL_ANIM, Player.Handle, "mic_chatter", "mp_facial");
        }
        if (scenarioUntil > 0 && now > scenarioUntil)
        {
            scenarioUntil = 0;
            Function.Call((Hash)CLEAR_PED_TASKS, Player.Handle);
        }
        if (invincibleUntil > 0 && now > invincibleUntil)
        {
            invincibleUntil = 0;
            if (!AlwaysInvincible) Function.Call((Hash)SET_ENTITY_INVINCIBLE, Player.Handle, false);
        }

        if (pendingAction != null && now >= pendingAt)
        {
            string action = pendingAction;
            pendingAction = null;
            if (Player.IsInVehicle()) Function.Call((Hash)CLEAR_PED_TASKS_IMMEDIATELY, Player.Handle);
            RunAction(action);
        }

        EffectsStep(now);
        WheelieStep(now);

        if (liveCamera) UpdateLiveCamera();
        MouthTestStep(now);
        if (HideHud && (liveCamera || autopilot) && mouthTest == 0)
        {
            // Esconde HUD, notificações ("novo local", dicas) e caixas de ajuda do jogo
            Function.Call((Hash)HIDE_HUD_AND_RADAR_THIS_FRAME);
            Function.Call((Hash)THEFEED_HIDE_THIS_FRAME);
            Function.Call((Hash)CLEAR_ALL_HELP_MESSAGES);
        }

        // Volta a ser o CJ depois de morrer/ser preso (só se o F11 estiver ligado)
        if (wantCj && now >= nextModelCheck)
        {
            nextModelCheck = now + 1000;
            Ped me = Player;
            if (!me.IsDead && !me.IsInVehicle()) EnsurePlayerModel();
        }

        if (autopilot)
        {
            // Sem ninguém no controle, o jogo trocaria para a câmera "parado" depois de ~30s
            Function.Call((Hash)INVALIDATE_IDLE_CAM);
            Function.Call((Hash)INVALIDATE_CINEMATIC_VEHICLE_IDLE_MODE);
            if (now >= nextCheck)
            {
                nextCheck = now + 1000;
                AutopilotStep(now);
            }
        }
    }

    // ---------- Câmera da live ----------

    void UpdateLiveCamera()
    {
        Ped p = Player;
        bool inCar = p.IsInVehicle();
        Entity target = inCar ? (Entity)p.CurrentVehicle : p;

        // Direção "para frente": a do movimento quando está andando rápido, senão a do corpo
        Vector3 fwd = target.ForwardVector;
        Vector3 vel = target.Velocity;
        if (vel.Length() > 2f) fwd = new Vector3(vel.X, vel.Y, 0f);
        // Gira o ângulo da câmera em volta do CJ (em vez de mover em linha reta e atravessar o corpo)
        if (fwd.X * fwd.X + fwd.Y * fwd.Y > 0.0001f)
        {
            float wantYaw = (float)Math.Atan2(fwd.Y, fwd.X);
            if (cam == null) camYaw = wantYaw;
            float diff = wantYaw - camYaw;
            while (diff > Math.PI) diff -= (float)(2 * Math.PI);
            while (diff < -Math.PI) diff += (float)(2 * Math.PI);
            camYaw += diff * CamSmooth;
        }
        fwd = new Vector3((float)Math.Cos(camYaw), (float)Math.Sin(camYaw), 0f);

        // No carro, de tempos em tempos (e enquanto ele fala), corta para um close do rosto
        int now = Game.GameTime;
        if (!inCar) nextCarClose = now + CarCloseEverySeconds * 1000;
        else if (now >= nextCarClose)
        {
            carCloseUntil = now + CarCloseSeconds * 1000;
            nextCarClose = carCloseUntil + CarCloseEverySeconds * 1000;
        }
        bool close = inCar && (talking || now < carCloseUntil);
        if (inCar)
        {
            // No carro a câmera fica presa nele: anda junto, sem correr atrás (era isso que tremia)
            CarShot(p, p.CurrentVehicle, close);
            return;
        }
        bool cut = camAttached != 0;
        if (camAttached != 0) DetachLiveCamera();

        float wantDistance = inCar ? CamCarDistance : (talking || mouthTest > 0 ? CamTalkDistance : CamFootDistance);
        camDistance += (wantDistance - camDistance) * 0.05f;

        Vector3 lookAt = inCar ? p.Position + new Vector3(0f, 0f, 0.6f) : p.Position + new Vector3(0f, 0f, 0.55f);
        // Um pouco para o lado e acima, para não ficar "chapado" na cara
        Vector3 side = new Vector3(fwd.Y, -fwd.X, 0f) * (inCar ? 1.8f : 0.6f);
        Vector3 wantPos = target.Position + fwd * camDistance + side + new Vector3(0f, 0f, inCar ? 2.0f : 0.65f);

        if (cam == null)
        {
            camPos = wantPos;
            cam = World.CreateCamera(camPos, Vector3.Zero, CamFov);
            World.RenderingCamera = cam;
        }
        // O ângulo já vem suavizado; aqui só amortece o balanço vertical/distância
        camPos = cut ? wantPos : camPos + (wantPos - camPos) * 0.35f;
        cam.Position = camPos;
        cam.PointAt(lookAt);
    }

    int nextCarClose, carCloseUntil;
    int camAttached;      // 0 = solta (a pé), 1 = presa no carro de longe, 2 = close do rosto
    int camVehicle;

    // Câmera presa no carro: de longe (na frente, de lado e acima) ou close do rosto pelo painel
    void CarShot(Ped p, Vehicle v, bool close)
    {
        int mode = close ? 2 : 1;
        if (cam == null)
        {
            cam = World.CreateCamera(v.Position, Vector3.Zero, CamFov);
            World.RenderingCamera = cam;
            camAttached = 0;
        }
        if (camAttached == mode && camVehicle == v.Handle) return; // já está presa: o jogo cuida do resto
        Function.Call((Hash)STOP_CAM_POINTING, cam.Handle);
        Function.Call((Hash)DETACH_CAM, cam.Handle);
        if (close)
        {
            Vector3 headWorld = Function.Call<Vector3>((Hash)GET_PED_BONE_COORDS, p.Handle, BONE_HEAD, 0f, 0f, 0f);
            Vector3 head = Function.Call<Vector3>((Hash)GET_OFFSET_FROM_ENTITY_GIVEN_WORLD_COORDS, v.Handle, headWorld.X, headWorld.Y, headWorld.Z);
            Function.Call((Hash)ATTACH_CAM_TO_ENTITY, cam.Handle, v.Handle, head.X + 0.3f, head.Y + 0.85f, head.Z + 0.05f, true);
            Function.Call((Hash)POINT_CAM_AT_PED_BONE, cam.Handle, p.Handle, BONE_HEAD, 0f, 0f, 0f, true);
        }
        else
        {
            Function.Call((Hash)ATTACH_CAM_TO_ENTITY, cam.Handle, v.Handle, 1.8f, CamCarDistance, 2.0f, true);
            Function.Call((Hash)POINT_CAM_AT_ENTITY, cam.Handle, v.Handle, 0f, 0f, 0.6f, true);
        }
        camAttached = mode;
        camVehicle = v.Handle;
    }

    void DetachLiveCamera()
    {
        camAttached = 0;
        camVehicle = 0;
        if (cam == null) return;
        Function.Call((Hash)STOP_CAM_POINTING, cam.Handle);
        Function.Call((Hash)DETACH_CAM, cam.Handle);
    }

    void DestroyLiveCamera()
    {
        if (cam == null) return;
        World.RenderingCamera = null;
        cam.Delete();
        cam = null;
        camAttached = 0;
    }

    // ---------- Piloto automático ----------

    void AutopilotStep(int now)
    {
        Ped p = Player;
        if (AlwaysInvincible) Function.Call((Hash)SET_ENTITY_INVINCIBLE, p.Handle, true);
        if (NoPolice && now >= policeUntil) // a ação "policia" libera as estrelas por um tempo
        {
            Function.Call((Hash)SET_MAX_WANTED_LEVEL, 0);
            if (Game.Player.WantedLevel > 0) Game.Player.WantedLevel = 0;
        }

        if (p.IsDead || p.IsInAir || p.IsRagdoll || now < busyUntil || now < enteringUntil) return;
        if (zone == null || now >= zoneUntil) PickNextZone(now);

        if (nextHumanAt == 0) nextHumanAt = now + rng.Next(HumanMinSeconds, HumanMaxSeconds + 1) * 1000;
        if (now >= nextHumanAt && now >= threatUntil && Game.Player.WantedLevel == 0 && !(zone != null && forcedActivity != null))
        {
            nextHumanAt = now + rng.Next(HumanMinSeconds, HumanMaxSeconds + 1) * 1000;
            if (HumanMove(p)) return;
        }

        if (p.IsInVehicle()) DriveStep(p, now);
        else FootStep(p, now);
    }

    // Sorteia uma atitude que faça sentido para onde ele está (no carro ou a pé). true = fez alguma coisa
    bool HumanMove(Ped p)
    {
        if (p.IsInVehicle())
        {
            Vehicle v = p.CurrentVehicle;
            if (v.Driver != p || v.Speed < 5f) return false;
            int roll = rng.Next(3);
            if (roll == 0) return Donut(true);
            if (roll == 1) return Burnout();
            return Ramp();
        }
        int pick = rng.Next(4);
        if (pick == 0) return StreetFight(true);
        if (pick == 1) return Vandalism(true);
        if (pick == 2) return ShootInAir(true);
        return Sprint();
    }

    // Troca para o modelo do CJ se ainda não estiver nele (ligado pelo F11). Retorna true se trocou agora.
    bool wantCj;
    int nextModelCheck;
    Model originalModel;
    bool modelFailed;
    bool EnsurePlayerModel()
    {
        if (PlayerModel.Length == 0 || modelFailed || Player.IsInVehicle()) return false;
        Model model = new Model(PlayerModel);
        if (Player.Model == model) return false;
        if (!model.IsInCdImage || !model.Request(5000))
        {
            modelFailed = true;
            GTA.UI.Notification.Show("CJ LIVE: modelo ~r~" + PlayerModel + "~w~ não encontrado no jogo");
            return false;
        }
        Game.Player.ChangeModel(model);
        Function.Call((Hash)SET_PED_DEFAULT_COMPONENT_VARIATION, Player.Handle);
        model.MarkAsNoLongerNeeded();
        stillSince = 0;
        return true;
    }

    // Sorteia o próximo bairro pelo peso (Centro 55%, Grove 30%, passeio livre 15%)
    void PickNextZone(int now)
    {
        int total = 0;
        foreach (Zone z in Zones) total += z.Weight;
        int roll = rng.Next(total);
        foreach (Zone z in Zones)
        {
            roll -= z.Weight;
            if (roll < 0) { zone = z; break; }
        }
        zoneUntil = now + (zone.Name == null ? CruiseMinutes : FootMinutes) * 60000;
        walkingBack = false;
        forcedActivity = null;
        nextActivityAt = 0;
        driveTaskIssued = false;
    }

    bool IsCruise { get { return zone.Name == null; } }

    float DistanceToZone(Vector3 pos)
    {
        return IsCruise ? 0f : Vector3.Distance2D(pos, zone.Center);
    }

    void FootStep(Ped p, int now)
    {
        driveTaskIssued = false;
        rushed = false;
        float dist = DistanceToZone(p.Position);

        // Precisa de carro: passeio livre, ou o bairro está longe demais para ir a pé
        if (IsCruise || dist > WalkToCarDistance)
        {
            if (now >= carCooldownUntil && TryTakeCar(p, now)) return;
            if (IsCruise) { KeepWandering(p, now); return; }
            // Sem carro por perto: vai andando na direção do bairro até achar um
            if (now - lastNavAt > 15000) WalkTo(p, zone.Center, now);
            return;
        }

        // Saiu do bairro: volta andando para o meio dele
        if (dist > zone.Radius * 1.2f && !walkingBack)
        {
            walkingBack = true;
            WalkTo(p, zone.Center, now);
            return;
        }
        if (walkingBack)
        {
            if (dist < zone.Radius * 0.6f) { walkingBack = false; Wander(); }
            else if (now - lastNavAt > 20000 || IsStill(p, now)) WalkTo(p, zone.Center, now);
            return;
        }

        // De vez em quando para e faz algo do bairro (malhar na praia, tirar foto em Vinewood...)
        if (forcedActivity != null) // pedido de presente (academia, píer): faz assim que chega
        {
            Scenario(forcedActivity, ActivityDurationSeconds * 2000);
            forcedActivity = null;
            nextActivityAt = now + ActivityDurationSeconds * 2000 + NextActivityDelay();
            return;
        }
        if (nextActivityAt == 0) nextActivityAt = now + NextActivityDelay();
        if (now >= nextActivityAt && zone.Activities.Length > 0)
        {
            nextActivityAt = now + ActivityDurationSeconds * 1000 + NextActivityDelay();
            if (rng.NextDouble() < FunnyEmoteChance) FunnyEmote();
            else Scenario(zone.Activities[rng.Next(zone.Activities.Length)], ActivityDurationSeconds * 1000);
            return;
        }

        KeepWandering(p, now);
    }

    int NextActivityDelay()
    {
        return rng.Next(ActivityMinSeconds, ActivityMaxSeconds + 1) * 1000;
    }

    void KeepWandering(Ped p, int now)
    {
        // Parado há mais de 3s (terminou uma ação, chegou num beco...): volta a passear
        if (IsStill(p, now)) Wander();
    }

    bool IsStill(Ped p, int now)
    {
        if (p.Speed >= 0.5f) { stillSince = 0; return false; }
        if (stillSince == 0) { stillSince = now; return false; }
        if (now - stillSince < 3000) return false;
        stillSince = 0;
        return true;
    }

    void WalkTo(Ped p, Vector3 target, int now)
    {
        lastNavAt = now;
        // velocidade 1.0 = andando; timeout -1; para a 2 m; sem direção final
        Function.Call((Hash)TASK_FOLLOW_NAV_MESH_TO_COORD, p.Handle, target.X, target.Y, target.Z, 1.0f, -1, 2f, 0, 40000f);
    }

    // Carros que ele tentou pegar e não conseguiu (alguém tirou ele, porta travada...): não insiste
    readonly Dictionary<int, int> badCars = new Dictionary<int, int>();
    int lastCarTry;
    int lastCarTryAt;

    bool TryTakeCar(Ped p, int now)
    {
        // Tentou esse mesmo carro há pouco e continua a pé: marca como ruim por 2 minutos
        if (lastCarTry != 0 && now - lastCarTryAt < 30000) badCars[lastCarTry] = now + 120000;
        lastCarTry = 0;

        Vehicle car = null;
        foreach (Vehicle v in World.GetNearbyVehicles(p.Position, 45f))
        {
            int until;
            if (!v.IsDriveable || (badCars.TryGetValue(v.Handle, out until) && now < until)) continue;
            if (car == null || v.Position.DistanceTo(p.Position) < car.Position.DistanceTo(p.Position)) car = v;
        }
        if (car == null) return false;
        lastCarTry = car.Handle;
        lastCarTryAt = now;
        Function.Call((Hash)TASK_ENTER_VEHICLE, p.Handle, car.Handle, 10000, -1, 2f, 8, 0); // 8 = puxa o motorista se tiver
        enteringUntil = now + 10000;
        stillSince = 0;
        driveTaskIssued = false;
        return true;
    }

    void DriveStep(Ped p, int now)
    {
        Vehicle v = p.CurrentVehicle;
        lastCarTry = 0; // conseguiu entrar
        if (v.Driver != p) { LeaveCar(p, now, false); return; }

        float dist = DistanceToZone(v.Position);
        // Chegou no bairro (ou acabou o passeio livre): desce e anda a pé
        if (!IsCruise && dist < zone.Radius * 0.5f) { LeaveCar(p, now, false); return; }
        if (IsCruise && now >= zoneUntil - 1000) { LeaveCar(p, now, false); return; }

        if (!driveTaskIssued) { Drive(p, v, DrivingStyle); return; }

        // Preso no trânsito: primeiro fica apressado, depois abandona o carro
        if (v.Speed < 1f)
        {
            if (stillSince == 0) stillSince = now;
            int stuck = now - stillSince;
            if (stuck > StuckAbandonSeconds * 1000) { LeaveCar(p, now, true); return; }
            if (stuck > StuckRushSeconds * 1000 && !rushed) { rushed = true; Drive(p, v, RushedStyle); }
        }
        else if (v.Speed > 4f)
        {
            stillSince = 0;
            if (rushed) { rushed = false; Drive(p, v, DrivingStyle); }
        }
    }

    void Drive(Ped p, Vehicle v, int style)
    {
        driveTaskIssued = true;
        if (IsCruise)
            Function.Call((Hash)TASK_VEHICLE_DRIVE_WANDER, p.Handle, v.Handle, DriveSpeed, style);
        else
            Function.Call((Hash)TASK_VEHICLE_DRIVE_TO_COORD_LONGRANGE, p.Handle, v.Handle, zone.Center.X, zone.Center.Y, zone.Center.Z, DriveSpeed, style, 30f);
    }

    void LeaveCar(Ped p, int now, bool abandoned)
    {
        // 256 = sai deixando a porta aberta e já sai andando
        Function.Call((Hash)TASK_LEAVE_VEHICLE, p.Handle, p.CurrentVehicle.Handle, abandoned ? 256 : 0);
        enteringUntil = now + 3000;
        stillSince = 0;
        driveTaskIssued = false;
        rushed = false;
        // Abandonou no trânsito: anda um pouco antes de pegar outro carro
        if (abandoned) carCooldownUntil = now + 20000;
    }

    void Wander()
    {
        Ped p = Player;
        if (p.IsInVehicle())
        {
            driveTaskIssued = false; // o DriveStep reemite a rota certa
        }
        else
        {
            Function.Call((Hash)TASK_WANDER_STANDARD, p.Handle, 10f, 10);
        }
    }

    // Segura o piloto automático enquanto a ação acontece
    void Busy(int ms)
    {
        busyUntil = Game.GameTime + ms;
        stillSince = 0;
    }

    void OnKeyDown(object sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.Pause)
        {
            StartMouthTest();
        }
        else if (e.KeyCode == Keys.F7)
        {
            liveCamera = !liveCamera;
            if (!liveCamera) DestroyLiveCamera();
            GTA.UI.Notification.Show("CJ LIVE câmera da live: " + (liveCamera ? "~g~ligada" : "~r~desligada"));
        }
        else if (e.KeyCode == Keys.F8)
        {
            autopilot = !autopilot;
            GTA.UI.Notification.Show("CJ LIVE piloto automático: " + (autopilot ? "~g~ligado" : "~r~desligado"));
            if (!autopilot) Function.Call((Hash)CLEAR_PED_TASKS, Player.Handle);
            else stillSince = 0;
        }
        else if (e.KeyCode == Keys.F9)
        {
            string action = TestActions[testIndex % TestActions.Length];
            testIndex++;
            GTA.UI.Notification.Show("CJ LIVE teste: ~y~" + action);
            RunAction(action);
        }
        else if (e.KeyCode == Keys.F10)
        {
            ShowStatus();
        }
        else if (e.KeyCode == Keys.End)
        {
            fitPart = (fitPart + (e.Shift ? PartNames.Length - 1 : 1)) % PartNames.Length;
            FitStep(0, 0);
        }
        else if (e.KeyCode == Keys.PageUp || e.KeyCode == Keys.PageDown)
        {
            FitStep(e.KeyCode == Keys.PageUp ? 1 : -1, 0);
        }
        else if (e.KeyCode == Keys.Delete)
        {
            FitStep(0, 1);
        }
        else if (e.KeyCode == Keys.F6)
        {
            Function.Call((Hash)CLEAR_ALL_PED_PROPS, Player.Handle);
            GTA.UI.Screen.ShowSubtitle("Provador: chapéu e óculos ~y~removidos", 2500);
        }
        else if (e.KeyCode == Keys.F5)
        {
            SaveOutfit();
        }
        else if (e.KeyCode == Keys.F12)
        {
            // Teste: cria o CJ como pedestre na frente do jogador (não troca o jogador)
            Model model = new Model(PlayerModel);
            if (!model.IsInCdImage || !model.Request(5000))
            {
                GTA.UI.Notification.Show("CJ LIVE: modelo ~r~não carregou");
                return;
            }
            Ped npc = World.CreatePed(model, Player.Position + Player.ForwardVector * 3f, Player.Heading + 180f);
            model.MarkAsNoLongerNeeded();
            GTA.UI.Notification.Show(npc != null ? "CJ LIVE: CJ ~g~criado como pedestre" : "CJ LIVE: ~r~falhou ao criar");
        }
        else if (e.KeyCode == Keys.F11)
        {
            wantCj = !wantCj;
            modelFailed = false;
            if (wantCj)
            {
                originalModel = Player.Model;
                GTA.UI.Notification.Show("CJ LIVE: virando o ~g~CJ");
                EnsurePlayerModel();
            }
            else if (originalModel.IsValid && Player.Model != originalModel)
            {
                Game.Player.ChangeModel(originalModel);
                GTA.UI.Notification.Show("CJ LIVE: voltando ao personagem original");
            }
        }
    }

    Ped Player { get { return Game.Player.Character; } }

    // ---------- Provador: escolhe e salva a roupa do CJ ----------

    static readonly string[] PartNames =
    {
        "rosto", "barba/máscara", "cabelo", "torso", "calça", "mãos",
        "sapato", "dentes/acessório", "acessório", "colete/bolsa", "decalque", "camisa/jaqueta"
    };
    int fitPart = 3;
    bool outfitLoaded;
    string OutfitFile { get { return System.IO.Path.Combine(BaseDirectory, "CjLive-roupa.txt"); } }

    // Muda a peça (dDrawable) ou a cor (dTexture) da parte escolhida e mostra na tela
    void FitStep(int dDrawable, int dTexture)
    {
        lastFitAt = Game.GameTime;
        int h = Player.Handle;
        int count = Function.Call<int>((Hash)GET_NUMBER_OF_PED_DRAWABLE_VARIATIONS, h, fitPart);
        int d = Function.Call<int>((Hash)GET_PED_DRAWABLE_VARIATION, h, fitPart);
        int t = Function.Call<int>((Hash)GET_PED_TEXTURE_VARIATION, h, fitPart);
        if (count > 0 && dDrawable != 0)
        {
            d = ((d + dDrawable) % count + count) % count;
            t = 0;
        }
        int colors = Function.Call<int>((Hash)GET_NUMBER_OF_PED_TEXTURE_VARIATIONS, h, fitPart, d);
        if (colors > 0 && dTexture != 0) t = (t + dTexture) % colors;
        string refused = "";
        if (count > 0 && (dDrawable != 0 || dTexture != 0))
        {
            Function.Call((Hash)SET_PED_COMPONENT_VARIATION, h, fitPart, d, t, 0);
            if (Function.Call<int>((Hash)GET_PED_DRAWABLE_VARIATION, h, fitPart) != d) refused = " ~r~(o jogo recusou)~w~";
        }
        GTA.UI.Screen.ShowSubtitle("Provador: ~y~" + PartNames[fitPart] + "~w~" + refused + " | peça " + (d + 1) + "/" + count +
            " | cor " + (t + 1) + "/" + Math.Max(colors, 1) + "~n~End = parte  PgUp/PgDn = peça  Delete = cor  F5 = salvar", 6000);
    }

    void SaveOutfit()
    {
        int h = Player.Handle;
        var sb = new StringBuilder();
        savedOutfit = new int[PartNames.Length, 2];
        for (int part = 0; part < PartNames.Length; part++)
        {
            int d = Function.Call<int>((Hash)GET_PED_DRAWABLE_VARIATION, h, part);
            int t = Function.Call<int>((Hash)GET_PED_TEXTURE_VARIATION, h, part);
            savedOutfit[part, 0] = d;
            savedOutfit[part, 1] = t;
            // 4ª coluna em diante só informa (quantas peças o jogo diz existir), para diagnóstico
            sb.Append(part).Append(' ').Append(d).Append(' ').Append(t).Append(" # pecas ")
              .Append(Function.Call<int>((Hash)GET_NUMBER_OF_PED_DRAWABLE_VARIATIONS, h, part)).AppendLine();
        }
        System.IO.File.WriteAllText(OutfitFile, sb.ToString());
        GTA.UI.Screen.ShowSubtitle("Provador: roupa ~g~salva~w~. O CJ vai usar essa roupa sempre.", 4000);
    }

    // Veste a roupa salva (e tira chapéu/óculos) ao abrir o jogo
    void LoadOutfit()
    {
        if (!System.IO.File.Exists(OutfitFile)) return;
        savedOutfit = new int[PartNames.Length, 2];
        for (int part = 0; part < PartNames.Length; part++) savedOutfit[part, 0] = -1;
        foreach (string line in System.IO.File.ReadAllLines(OutfitFile))
        {
            string[] v = line.Split(' ');
            int part, d, t;
            if (v.Length >= 3 && int.TryParse(v[0], out part) && int.TryParse(v[1], out d) && int.TryParse(v[2], out t)
                && part >= 0 && part < PartNames.Length)
            {
                savedOutfit[part, 0] = d;
                savedOutfit[part, 1] = t;
            }
        }
        ApplyOutfit();
        Function.Call((Hash)CLEAR_ALL_PED_PROPS, Player.Handle);
    }

    int[,] savedOutfit;
    int lastFitAt = -100000;
    int nextOutfitCheck;

    void ApplyOutfit()
    {
        int h = Player.Handle;
        for (int part = 0; part < PartNames.Length; part++)
        {
            if (savedOutfit[part, 0] < 0) continue;
            if (Function.Call<int>((Hash)GET_PED_DRAWABLE_VARIATION, h, part) != savedOutfit[part, 0] ||
                Function.Call<int>((Hash)GET_PED_TEXTURE_VARIATION, h, part) != savedOutfit[part, 1])
                Function.Call((Hash)SET_PED_COMPONENT_VARIATION, h, part, savedOutfit[part, 0], savedOutfit[part, 1], 0);
        }
    }

    // O modo história às vezes devolve o cabelo/barba do Franklin: reaplica a roupa salva
    void KeepOutfit(int now)
    {
        if (savedOutfit == null || now < nextOutfitCheck || now - lastFitAt < 30000) return;
        nextOutfitCheck = now + 2000;
        if (!Player.IsDead) ApplyOutfit();
    }

    void ShowStatus()
    {
        GTA.UI.Notification.Show(connected ? "CJ LIVE: ~g~conectado" : "CJ LIVE: ~r~desconectado~w~ (rode o index.js)");
    }

    void Handle(string raw)
    {
        string type = Field(raw, "type");
        if (type == "_status") ShowStatus();
        else if (type == "action") RunAction(Field(raw, "action"));
        else if (type == "speak_start") StartTalking(Number(raw, "durationMs", 4000));
        else if (type == "speak_end") StopTalking();
    }

    static string Field(string json, string name)
    {
        Match m = Regex.Match(json, "\"" + name + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
        return m.Success ? Regex.Unescape(m.Groups[1].Value) : "";
    }

    static int Number(string json, string name, int fallback)
    {
        Match m = Regex.Match(json, "\"" + name + "\"\\s*:\\s*(\\d+)");
        int value;
        return m.Success && int.TryParse(m.Groups[1].Value, out value) ? value : fallback;
    }

    // ---------- Teste da boca (Pause) ----------
    // Tenta 3 jeitos de mexer a boca, 5 s cada, com a câmera no rosto. Serve para descobrir qual funciona
    // com o modelo do CJ: 1 e 2 são animações do rosto; 3 é uma fala do próprio jogo (voz do Franklin).
    // Se nem o 3 mexe a boca, o rosto do modelo não tem os "ossos" de animação.
    int mouthTest;
    int mouthTestAt;
    bool cameraBeforeTest;

    void StartMouthTest()
    {
        if (Player.IsInVehicle()) { GTA.UI.Notification.Show("CJ LIVE: faça o teste da boca a pé"); return; }
        cameraBeforeTest = liveCamera;
        liveCamera = true;
        Function.Call((Hash)CLEAR_PED_TASKS, Player.Handle);
        Busy(17000);
        mouthTest = 0;
        NextMouthTest();
    }

    void NextMouthTest()
    {
        Ped p = Player;
        StopTalking();
        Function.Call((Hash)CLEAR_PED_TASKS, p.Handle);
        mouthTest++;
        mouthTestAt = Game.GameTime + 5000;
        if (mouthTest > 3)
        {
            mouthTest = 0;
            liveCamera = cameraBeforeTest;
            if (!liveCamera) DestroyLiveCamera();
            GTA.UI.Screen.ShowSubtitle("Teste da boca terminou. Conte qual número mexeu a boca (1, 2, 3 ou nenhum).", 6000);
            return;
        }
        if (!LoadDict("mp_facial")) return;
        if (mouthTest == 1)
        {
            Function.Call((Hash)SET_FACIAL_IDLE_ANIM_OVERRIDE, p.Handle, "mic_chatter", "mp_facial");
            Function.Call((Hash)PLAY_FACIAL_ANIM, p.Handle, "mic_chatter", "mp_facial");
        }
        else if (mouthTest == 2)
        {
            // a mesma animação, mas como animação normal (1 = repete, 16 = parte de cima, 32 = secundária)
            Function.Call((Hash)TASK_PLAY_ANIM, p.Handle, "mp_facial", "mic_chatter", 8f, -8f, 5000, 49, 0f, false, false, false);
        }
        else
        {
            Function.Call((Hash)PLAY_PED_AMBIENT_SPEECH_NATIVE, p.Handle, "GENERIC_HI", "SPEECH_PARAMS_FORCE_NORMAL");
        }
        string[] names = { "", "animação do rosto", "animação normal", "fala do próprio jogo" };
        GTA.UI.Screen.ShowSubtitle("Teste da boca ~y~" + mouthTest + "/3~w~: " + names[mouthTest] + " — a boca mexe?", 5000);
    }

    void MouthTestStep(int now)
    {
        if (mouthTest == 0) return;
        if (now >= mouthTestAt) { NextMouthTest(); return; }
        if (mouthTest == 1 && now >= nextFacialAt)
        {
            nextFacialAt = now + 1500;
            Function.Call((Hash)PLAY_FACIAL_ANIM, Player.Handle, "mic_chatter", "mp_facial");
        }
        if (mouthTest == 3 && now >= nextFacialAt) // repete a fala do jogo
        {
            nextFacialAt = now + 2000;
            Function.Call((Hash)PLAY_PED_AMBIENT_SPEECH_NATIVE, Player.Handle, "GENERIC_HOWS_IT_GOING", "SPEECH_PARAMS_FORCE_NORMAL");
        }
    }

    // ---------- Boca mexendo ----------

    void StartTalking(int durationMs)
    {
        if (!LoadDict("mp_facial")) return;
        Function.Call((Hash)SET_FACIAL_IDLE_ANIM_OVERRIDE, Player.Handle, "mic_chatter", "mp_facial");
        Function.Call((Hash)PLAY_FACIAL_ANIM, Player.Handle, "mic_chatter", "mp_facial");
        nextFacialAt = Game.GameTime + 1500;
        talking = true;
        talkUntil = Game.GameTime + durationMs + 1500;
        // Gesticula com as mãos durante a fala toda (só a parte de cima do corpo: continua andando)
        nextGestureAt = durationMs > 1200 ? Game.GameTime : int.MaxValue;
    }

    static readonly string[] TalkGestures =
    {
        "gesture_hello", "gesture_damn", "gesture_why", "gesture_you_soft", "gesture_bring_it_on", "gesture_shrug_hard",
        "gesture_point", "gesture_easy_now", "gesture_no_way", "gesture_pleased", "gesture_what_hard", "gesture_hand_down",
        "gesture_come_here_soft", "gesture_i_will", "gesture_nod_yes_soft", "gesture_head_no"
    };
    int nextGestureAt = int.MaxValue;
    int lastGesture = -1;

    // Um gesto atrás do outro enquanto fala, sem repetir o mesmo seguido
    void TalkGestureStep(int now)
    {
        if (!talking || now < nextGestureAt || now < busyUntil) return;
        nextGestureAt = now + rng.Next(1800, 3200);
        int i = rng.Next(TalkGestures.Length);
        if (i == lastGesture) i = (i + 1) % TalkGestures.Length;
        lastGesture = i;
        Gesture("gestures@m@standing@casual", TalkGestures[i]);
    }

    // Animação curta só no tronco (flag 48), sem travar o passeio; a pé e fora de briga
    void Gesture(string dict, string clip)
    {
        Ped p = Player;
        if (p.IsInVehicle() || p.IsRagdoll || Game.GameTime < threatUntil || !LoadDict(dict)) return;
        Function.Call((Hash)TASK_PLAY_ANIM, p.Handle, dict, clip, 8f, -8f, -1, 48, 0f, false, false, false);
    }

    // Reação do CJ junto com a ação do presente
    void ActionGesture(string action)
    {
        const string celebrate = "anim@mp_player_intcelebrationmale@";
        switch (action)
        {
            case "chuva_dinheiro": Gesture(celebrate + "raining_cash", "raining_cash"); break;
            case "grove_aliados": Gesture(celebrate + "bro_love", "bro_love"); break;
            case "noite":
            case "fogos": Gesture(celebrate + "thumbs_up", "thumbs_up"); break;
            case "tempestade":
            case "palhacos":
            case "chuva_vacas":
            case "policia": Gesture(celebrate + "face_palm", "face_palm"); break;
            case "neve":
            case "tornado": Gesture(celebrate + "thumbs_up", "thumbs_up"); break;
        }
    }

    void StopTalking()
    {
        if (!talking) return;
        talking = false;
        nextGestureAt = int.MaxValue;
        Function.Call((Hash)CLEAR_FACIAL_IDLE_ANIM_OVERRIDE, Player.Handle);
        Function.Call((Hash)PLAY_FACIAL_ANIM, Player.Handle, "mood_normal_1", "facials@gen_male@variations@normal");
    }

    // ---------- Reações ao que acontece no jogo ----------
    // Detecta polícia, tiros, explosões, batidas e quedas. Avisa o index.js (o CJ comenta na live)
    // e, com o piloto automático ligado, reage com o corpo: foge, revida ou sai correndo.

    int nextReactCheck;
    int lastWanted;
    int wantedSince;
    const int PoliceMaxSeconds = 150; // depois disso a polícia desiste do CJ
    int threatUntil;       // ações de briga (Ballas, pumas): revida até essa hora
    int fightIssuedAt;
    int fleeUntil;
    bool escaping;         // fugindo da polícia de carro
    float lastCarSpeed;
    bool wasRagdoll;
    int lastActionAt;      // a ação do presente já foi narrada: não comenta o mesmo de novo
    int lastEventAt;
    readonly Dictionary<string, int> eventCooldown = new Dictionary<string, int>();

    void ReactStep(int now)
    {
        Ped p = Player;
        if (p.IsDead) return;
        if (autopilot || liveCamera) LiveSafety(p, now);

        // Polícia
        int wanted = Game.Player.WantedLevel;
        // Perseguição longa demais cansa a live: a polícia some de uma vez
        if (wanted > 0 && lastWanted == 0) wantedSince = now;
        if (wanted > 0 && now - wantedSince > PoliceMaxSeconds * 1000)
        {
            Game.Player.WantedLevel = 0;
            policeUntil = 0;
            wanted = 0;
        }
        if (wanted > 0 && lastWanted == 0) GameEvent("policia", "A policia comecou a perseguir o CJ (" + wanted + " estrelas)", now);
        if (wanted == 0 && lastWanted > 0) GameEvent("despistou", "O CJ despistou a policia", now);
        lastWanted = wanted;

        // Levou tiro / apanhou (ele é invencível, mas sente)
        if (Function.Call<bool>((Hash)HAS_ENTITY_BEEN_DAMAGED_BY_ANY_PED, p.Handle))
        {
            // Descobre quem foi, para o CJ revidar nessa pessoa
            foreach (Ped other in World.GetNearbyPeds(p, 30f))
            {
                if (!other.IsDead && Function.Call<bool>((Hash)HAS_ENTITY_BEEN_DAMAGED_BY_ENTITY, p.Handle, other.Handle, true))
                {
                    attacker = other;
                    break;
                }
            }
            Function.Call((Hash)CLEAR_ENTITY_LAST_DAMAGE_ENTITY, p.Handle);
            GameEvent("atacado", "Alguem atacou o CJ (tiro ou porrada)", now);
            if (now > threatUntil) threatUntil = now + 15000;
        }

        // Tiroteio por perto
        foreach (Ped other in World.GetNearbyPeds(p, 35f))
        {
            if (other.IsDead || !Function.Call<bool>((Hash)IS_PED_SHOOTING, other.Handle)) continue;
            GameEvent("tiroteio", "Comecou um tiroteio perto do CJ", now);
            break;
        }

        // Explosão perto
        Vector3 pos = p.Position;
        bool boom = Function.Call<bool>((Hash)IS_EXPLOSION_IN_SPHERE, -1, pos.X, pos.Y, pos.Z, 25f);
        if (boom) GameEvent("explosao", "Explodiu alguma coisa do lado do CJ", now);

        // Batida de carro / caiu ou foi atropelado
        if (p.IsInVehicle())
        {
            float speed = p.CurrentVehicle.Speed;
            if (lastCarSpeed > 12f && speed < lastCarSpeed - 9f) GameEvent("bateu", "O CJ bateu o carro com tudo", now);
            lastCarSpeed = speed;
        }
        else lastCarSpeed = 0f;
        bool ragdoll = p.IsRagdoll;
        if (ragdoll && !wasRagdoll && !p.IsInVehicle()) GameEvent("caiu", "O CJ caiu no chao (atropelado ou derrubado)", now);
        wasRagdoll = ragdoll;

        if (autopilot) ReactBody(p, now, wanted, boom);
    }

    void ReactBody(Ped p, int now, int wanted, bool boom)
    {
        // Polícia: primeiro troca tiro com a AK (se foi sorteado), depois foge.
        // A pé pega um carro; no carro vai para a oficina de pintura mais perto, ou acelera sem rumo.
        if (wanted > 0)
        {
            if (now < policeFightUntil && !p.IsInVehicle())
            {
                if (now - fightIssuedAt > 5000)
                {
                    fightIssuedAt = now;
                    Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, WEAPON_AK, 600, false, true);
                    Function.Call((Hash)SET_CURRENT_PED_WEAPON, p.Handle, WEAPON_AK, true);
                    Function.Call((Hash)TASK_COMBAT_HATED_TARGETS_AROUND_PED, p.Handle, 80f, 0);
                }
                busyUntil = Math.Max(busyUntil, now + 1500);
                return;
            }
            if (p.IsInVehicle())
            {
                Vehicle car = p.CurrentVehicle;
                if (car.Driver != p) return;
                if (goingToPaint && Vector3.Distance2D(car.Position, paintTarget) < 15f) { Repaint(car); return; }
                if (!escaping)
                {
                    escaping = true;
                    goingToPaint = NearestPaintShop(car.Position, out paintTarget);
                    if (goingToPaint)
                        Function.Call((Hash)TASK_VEHICLE_DRIVE_TO_COORD_LONGRANGE, p.Handle, car.Handle, paintTarget.X, paintTarget.Y, paintTarget.Z, 32f, RushedStyle, 8f);
                    else
                        Function.Call((Hash)TASK_VEHICLE_DRIVE_WANDER, p.Handle, car.Handle, 32f, RushedStyle);
                }
            }
            else if (now >= enteringUntil && !TryTakeCar(p, now))
            {
                Function.Call((Hash)TASK_SMART_FLEE_COORD, p.Handle, p.Position.X, p.Position.Y, p.Position.Z, 300f, 8000, false, false);
                busyUntil = now + 8000;
            }
            return;
        }
        if (escaping)
        {
            escaping = false;
            goingToPaint = false;
            driveTaskIssued = false; // volta para a rota normal
        }

        // Atacado dentro do carro (gente brava batendo na janela): arranca e vai embora
        if (now < threatUntil && p.IsInVehicle() && p.CurrentVehicle.Driver == p && now - fightIssuedAt > 5000)
        {
            fightIssuedAt = now;
            Function.Call((Hash)TASK_VEHICLE_DRIVE_WANDER, p.Handle, p.CurrentVehicle.Handle, 25f, RushedStyle);
            driveTaskIssued = false; // depois o DriveStep volta para a rota normal
            return;
        }

        // Briga: saca a pistola e revida em quem estiver hostil por perto
        if (now < threatUntil && !p.IsInVehicle())
        {
            if (now - fightIssuedAt > 5000)
            {
                fightIssuedAt = now;
                uint gun = threatUntil - now > 20000 ? WEAPON_AK : WEAPON_PISTOL; // briga grande: AK
                Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, gun, 300, false, true);
                Function.Call((Hash)SET_CURRENT_PED_WEAPON, p.Handle, gun, true);
                Ped target = FindEnemy(p);
                if (target != null) Function.Call((Hash)TASK_COMBAT_PED, p.Handle, target.Handle, 0, 16);
                else Function.Call((Hash)TASK_COMBAT_HATED_TARGETS_AROUND_PED, p.Handle, 40f, 0);
            }
            busyUntil = Math.Max(busyUntil, now + 1500);
            return;
        }

        // Explosão a pé: sai correndo de perto
        if (boom && !p.IsInVehicle() && now > fleeUntil)
        {
            fleeUntil = now + 6000;
            Function.Call((Hash)TASK_SMART_FLEE_COORD, p.Handle, p.Position.X, p.Position.Y, p.Position.Z, 60f, 6000, false, false);
            busyUntil = Math.Max(busyUntil, fleeUntil);
        }
    }

    Ped attacker; // último que bateu/atirou no CJ

    // Quem revidar: quem bateu por último; senão, qualquer um brigando com o CJ por perto
    Ped FindEnemy(Ped p)
    {
        if (attacker != null && attacker.Exists() && !attacker.IsDead && attacker.Position.DistanceTo(p.Position) < 40f)
            return attacker;
        foreach (Ped other in World.GetNearbyPeds(p, 40f))
        {
            if (!other.IsDead && Function.Call<bool>((Hash)IS_PED_IN_COMBAT, other.Handle, p.Handle)) return other;
        }
        return null;
    }

    // Modo live: o CJ não morre, ninguém tira ele do carro e ele não fica todo sujo de sangue
    int nextCleanAt;

    void LiveSafety(Ped p, int now)
    {
        Function.Call((Hash)SET_ENTITY_INVINCIBLE, p.Handle, true);
        Function.Call((Hash)SET_PLAYER_INVINCIBLE, Game.Player.Handle, true);
        Function.Call((Hash)SET_PED_SUFFERS_CRITICAL_HITS, p.Handle, false);
        Function.Call((Hash)SET_PED_CAN_BE_DRAGGED_OUT, p.Handle, false);
        Function.Call((Hash)SET_PED_CAN_BE_KNOCKED_OFF_VEHICLE, p.Handle, 1); // 1 = nunca cai da moto/bike
        if (p.Health < p.MaxHealth) p.Health = p.MaxHealth;

        if (p.IsInVehicle())
        {
            Vehicle v = p.CurrentVehicle;
            // Carro muito batido para de andar: conserta na hora (mantém o rolê da live)
            if (v.Driver == p && (v.EngineHealth < 300f || v.BodyHealth < 300f))
            {
                Function.Call((Hash)SET_VEHICLE_FIXED, v.Handle);
                Function.Call((Hash)SET_VEHICLE_DIRT_LEVEL, v.Handle, 0f);
            }
        }
        if (now >= nextCleanAt)
        {
            nextCleanAt = now + 15000;
            Function.Call((Hash)CLEAR_PED_BLOOD_DAMAGE, p.Handle);
        }
    }

    // Manda o evento para o index.js, sem repetir o mesmo assunto e sem falar por cima da ação do presente
    void GameEvent(string kind, string text, int now)
    {
        int until;
        if (eventCooldown.TryGetValue(kind, out until) && now < until) return;
        eventCooldown[kind] = now + 25000;
        if (now - lastActionAt < 8000 || now - lastEventAt < 10000 || !connected) return;
        lastEventAt = now;
        outbox.Enqueue("{\"type\":\"game_event\",\"payload\":{\"kind\":\"" + kind + "\",\"text\":\"" + text + "\"}}");
    }

    // ---------- Ações dos presentes / missões ----------

    void RunAction(string action)
    {
        lastActionAt = Game.GameTime;
        // Animações precisam do CJ a pé: se estiver dirigindo, desce do carro e faz depois
        bool needsFoot = action == "aplaudir" || action == "dancar" || action == "acenar" || action == "flexionar" || action == "maluquice";
        if (needsFoot && Player.IsInVehicle())
        {
            Function.Call((Hash)TASK_LEAVE_VEHICLE, Player.Handle, Player.CurrentVehicle.Handle, 0);
            pendingAction = action;
            pendingAt = Game.GameTime + 2500;
            Busy(3000);
            return;
        }

        switch (action)
        {
            case "aplaudir": Scenario("WORLD_HUMAN_CHEERING", 6000); break;
            case "dancar": PlayAnim("missfbi3_sniping", "dance_m_default", 8000, 1); break;
            case "acenar": PlayAnim("friends@frj@ig_1", "wave_a", 3000, 48); break;
            case "voar": Fly(); break;
            case "tempestade": Function.Call((Hash)SET_WEATHER_TYPE_OVERTIME_PERSIST, "THUNDER", 10f); break;
            case "explodir_tudo": ExplodeAround(); break;
            case "fogos": Fireworks(); break;
            case "carro_tunado": TunedCar(); break;
            case "pumas": Pumas(); break;
            case "queda_livre": FreeFall(); break;
            case "flexionar": Scenario("WORLD_HUMAN_MUSCLE_FLEX", 7000); break;
            case "noite": ToggleNight(); break;
            case "bmx": SpawnRide("bmx", false, 1); break;
            case "tanque": SpawnRide("rhino", false, 1); break;
            case "chuva_dinheiro": MoneyRain(); break;
            case "grove_aliados": GroveCrew(); break;
            case "ballas": BallasAttack(); break;
            case "policia": PoliceChase(); break;
            case "moto": SpawnRide("pcj", false, 2); break; // a PCJ-600, a moto clássica do CJ
            case "academia": GoToZone("Muscle Beach", "WORLD_HUMAN_MUSCLE_FREE_WEIGHTS"); break;
            case "pier": GoToZone("Píer", "WORLD_HUMAN_STAND_FISHING"); break;
            case "empinar": SpawnRide("sanchez", false, 2); wheelieBoostUntil = Game.GameTime + 90000; nextWheelieAt = Game.GameTime + 3000; break;
            case "neve": Snow(); break;
            case "bebado": Drunk(); break;
            case "camera_lenta": SlowMotion(); break;
            case "lua": MoonGravity(); break;
            case "palhacos": Clowns(); break;
            case "chuva_vacas": CowRain(); break;
            case "chuva_carros": CarRain(); break;
            case "tornado": Tornado(); break;
            case "queda_aviao": PlaneCrash(); break;
            case "maluquice": FunnyEmote(); break;
            case "zerinho": if (!Donut(false)) SpawnRide("sultan", false, 1); break;
            case "rampa": if (!Ramp()) SpawnRide("sanchez", false, 1); break;
            case "vandalismo": EjectFromVehicle(Player); Vandalism(false); break;
            case "briga": EjectFromVehicle(Player); StreetFight(false); break;
            case "tiro_pro_alto": EjectFromVehicle(Player); ShootInAir(false); break;
            case "corrida": EjectFromVehicle(Player); Sprint(); break;
            case "andar_trevor": TrevorWalk(); break;
            case "furia_trevor": TrevorRage(); break;
            // Pedidos do chat: só bairros da lista (todos em terra firme)
            case "ir_grove": GoToZone("Grove", null); break;
            case "ir_praia": GoToZone("Praia", "WORLD_HUMAN_MUSCLE_FLEX"); break;
            case "ir_vinewood": GoToZone("Vinewood", "WORLD_HUMAN_TOURIST_MOBILE"); break;
            case "ir_centro": GoToZone("Centro", null); break;
            default: GTA.UI.Notification.Show("CJ LIVE: ação desconhecida ~y~" + action); return;
        }
        ActionGesture(action);
    }

    bool LoadDict(string dict)
    {
        Function.Call((Hash)REQUEST_ANIM_DICT, dict);
        int timeout = Game.GameTime + 2000;
        while (!Function.Call<bool>((Hash)HAS_ANIM_DICT_LOADED, dict))
        {
            if (Game.GameTime > timeout) return false;
            Wait(0);
        }
        return true;
    }

    // flag 1 = repetir, 48 = só parte de cima do corpo (pode andar)
    void PlayAnim(string dict, string anim, int durationMs, int flag)
    {
        if (Player.IsInVehicle() || !LoadDict(dict)) return;
        Function.Call((Hash)TASK_PLAY_ANIM, Player.Handle, dict, anim, 8f, -8f, durationMs, flag, 0f, false, false, false);
        Busy(durationMs + 500);
    }

    void Scenario(string name, int durationMs)
    {
        if (Player.IsInVehicle()) return;
        Function.Call((Hash)TASK_START_SCENARIO_IN_PLACE, Player.Handle, name, 0, true);
        scenarioUntil = Game.GameTime + durationMs; // o OnTick encerra o cenário
        Busy(durationMs + 500);
    }

    // Tira o CJ do carro na hora (para voar / cair)
    void EjectFromVehicle(Ped p)
    {
        if (p.IsInVehicle()) Function.Call((Hash)CLEAR_PED_TASKS_IMMEDIATELY, p.Handle);
    }

    void Protect(int ms)
    {
        Function.Call((Hash)SET_ENTITY_INVINCIBLE, Player.Handle, true);
        invincibleUntil = Game.GameTime + ms;
    }

    void Fly()
    {
        Ped p = Player;
        EjectFromVehicle(p);
        Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, PARACHUTE, 1, false, true);
        Protect(15000);
        Busy(15000);
        Vector3 fwd = p.ForwardVector;
        p.Velocity = new Vector3(fwd.X * 25f, fwd.Y * 25f, 45f);
    }

    void FreeFall()
    {
        Ped p = Player;
        EjectFromVehicle(p);
        Protect(20000); // cai sem paraquedas, mas não morre
        Busy(12000);
        p.Position = p.Position + new Vector3(0f, 0f, 250f);
    }

    void ExplodeAround()
    {
        Ped p = Player;
        Protect(5000);
        int count = 0;
        foreach (Vehicle v in World.GetNearbyVehicles(p.Position, 60f))
        {
            if (v == p.CurrentVehicle) continue;
            Explosion(v.Position, EXPLOSION_GRENADE);
            if (++count >= 20) break;
        }
        foreach (Ped other in World.GetNearbyPeds(p, 40f))
        {
            if (count++ >= 30) break;
            Explosion(other.Position, EXPLOSION_GRENADE);
        }
        if (count == 0)
        {
            for (int i = 0; i < 5; i++) Explosion(p.Position + RandomOffset(15f), EXPLOSION_GRENADE);
        }
    }

    void Fireworks()
    {
        Vector3 basePos = Player.Position;
        for (int i = 0; i < 18; i++)
        {
            Explosion(basePos + RandomOffset(25f) + new Vector3(0f, 0f, 20f + rng.Next(25)), EXPLOSION_FIREWORK);
            Wait(150);
        }
    }

    void TunedCar()
    {
        SpawnRide("voodoo", true, CruiseMinutes);
    }

    // Cria um veículo na frente do CJ, coloca ele dirigindo e sai num passeio livre
    void SpawnRide(string modelName, bool tuned, int cruiseMinutes)
    {
        Ped p = Player;
        Model model = new Model(modelName);
        if (!model.Request(3000)) return;
        EjectFromVehicle(p);
        Vector3 pos = p.Position + p.ForwardVector * 6f;
        Vehicle car = World.CreateVehicle(model, pos, p.Heading);
        model.MarkAsNoLongerNeeded();
        if (car == null) return;

        if (tuned)
        {
            Function.Call((Hash)SET_VEHICLE_MOD_KIT, car.Handle, 0);
            for (int type = 0; type < 50; type++)
            {
                int count = Function.Call<int>((Hash)GET_NUM_VEHICLE_MODS, car.Handle, type);
                if (count > 0) Function.Call((Hash)SET_VEHICLE_MOD, car.Handle, type, count - 1, false);
            }
            for (int i = 0; i < 4; i++) Function.Call((Hash)SET_VEHICLE_NEON_ENABLED, car.Handle, i, true);
            Function.Call((Hash)SET_VEHICLE_NEON_COLOUR, car.Handle, 40, 255, 60);
        }
        Function.Call((Hash)SET_VEHICLE_CUSTOM_PRIMARY_COLOUR, car.Handle, 20, 160, 40); // verde Grove Street
        Function.Call((Hash)SET_PED_HELMET, p.Handle, false); // na moto, sem capacete: aparece o rosto do CJ
        Function.Call((Hash)SET_PED_INTO_VEHICLE, p.Handle, car.Handle, -1);
        car.MarkAsNoLongerNeeded();
        foreach (Zone z in Zones) if (z.Name == null) zone = z;
        zoneUntil = Game.GameTime + cruiseMinutes * 60000;
        busyUntil = 0;
        driveTaskIssued = false;
    }

    // Manda o CJ para um bairro (ele vai sozinho, dirigindo ou a pé) e, chegando lá, faz a atividade
    string forcedActivity;
    void GoToZone(string namePart, string activity)
    {
        foreach (Zone z in Zones)
        {
            if (z.Name == null || z.Name.IndexOf(namePart, StringComparison.OrdinalIgnoreCase) < 0) continue;
            zone = z;
            zoneUntil = Game.GameTime + FootMinutes * 60000;
            walkingBack = false;
            nextActivityAt = 0;
            driveTaskIssued = false;
            forcedActivity = activity;
            GTA.UI.Notification.Show("CJ LIVE: indo para ~g~" + z.Name);
            return;
        }
    }

    // Alterna entre noite (22h) e meio-dia
    void ToggleNight()
    {
        int hour = Function.Call<int>((Hash)GET_CLOCK_HOURS);
        bool isNight = hour >= 20 || hour < 6;
        Function.Call((Hash)SET_CLOCK_TIME, isNight ? 12 : 22, 0, 0);
        nightForcedUntil = isNight ? 0 : Game.GameTime + 180000; // a noite pedida dura uns 3 minutos
    }

    // Chove dinheiro em volta do CJ (ele passa pegando)
    void MoneyRain()
    {
        Ped p = Player;
        for (int i = 0; i < 35; i++)
        {
            Vector3 pos = p.Position + RandomOffset(8f) + new Vector3(0f, 0f, 4f + rng.Next(6));
            Function.Call((Hash)CREATE_AMBIENT_PICKUP, PICKUP_MONEY_VARIABLE, pos.X, pos.Y, pos.Z, 0, 500, 0, false, true);
        }
    }

    // A Grove chega: 10 manos da Families viram guarda-costas por um tempo
    readonly List<Ped> crew = new List<Ped>();
    int crewUntil;
    const int CrewSeconds = 180;
    const int CrewSize = 10;

    void GroveCrew()
    {
        Ped p = Player;
        int group = Function.Call<int>((Hash)GET_PED_GROUP_INDEX, p.Handle);
        string[] models = { "g_m_y_famca_01", "g_m_y_famfor_01", "g_m_y_famdnf_01" };
        for (int i = 0; i < CrewSize; i++)
        {
            Model model = new Model(models[i % models.Length]);
            if (!model.Request(3000)) continue;
            Ped homie = World.CreatePed(model, p.Position + RandomRing(4f, 9f));
            if (homie == null) continue;
            Function.Call((Hash)SET_PED_RELATIONSHIP_GROUP_HASH, homie.Handle, Game.GenerateHash("PLAYER"));
            Function.Call((Hash)GIVE_WEAPON_TO_PED, homie.Handle, i % 3 == 0 ? WEAPON_AK : WEAPON_PISTOL, 400, false, true);
            // O grupo do jogador tem vaga para 7: os outros seguem o CJ por conta própria
            if (i < 7) Function.Call((Hash)SET_PED_AS_GROUP_MEMBER, homie.Handle, group);
            else Function.Call((Hash)TASK_FOLLOW_TO_OFFSET_OF_ENTITY, homie.Handle, p.Handle, RandomFloat(3f), -2f - i * 0.5f, 0f, 2f, -1, 2f, true);
            crew.Add(homie);
        }
        foreach (string name in models) new Model(name).MarkAsNoLongerNeeded();
        crewUntil = Game.GameTime + CrewSeconds * 1000;
    }

    void ReleaseCrew()
    {
        foreach (Ped homie in crew)
        {
            if (homie == null || !homie.Exists()) continue;
            Function.Call((Hash)REMOVE_PED_FROM_GROUP, homie.Handle);
            homie.MarkAsNoLongerNeeded();
        }
        crew.Clear();
    }

    // Os Ballas chegam em peso (12, de dois lados); o CJ pega a AK e se defende
    const int BallasCount = 12;

    void BallasAttack()
    {
        Ped p = Player;
        EjectFromVehicle(p);
        Protect(50000);
        Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, WEAPON_AK, 600, false, true);
        string[] models = { "g_m_y_ballasout_01", "g_m_y_ballaeast_01", "g_m_y_ballaorig_01" };
        uint[] guns = { WEAPON_PISTOL, WEAPON_MICROSMG, WEAPON_AK };
        Ped first = null;
        for (int i = 0; i < BallasCount; i++)
        {
            Model model = new Model(models[i % models.Length]);
            if (!model.Request(3000)) continue;
            Vector3 side = i % 2 == 0 ? -p.ForwardVector : p.RightVector; // metade atrás, metade do lado
            Ped balla = World.CreatePed(model, p.Position + side * (16f + rng.Next(8)) + RandomOffset(5f));
            if (balla == null) continue;
            Function.Call((Hash)GIVE_WEAPON_TO_PED, balla.Handle, guns[rng.Next(guns.Length)], 300, false, true);
            Function.Call((Hash)TASK_COMBAT_PED, balla.Handle, p.Handle, 0, 16);
            balla.MarkAsNoLongerNeeded();
            if (first == null) first = balla;
        }
        foreach (string name in models) new Model(name).MarkAsNoLongerNeeded();
        if (first != null) Function.Call((Hash)TASK_COMBAT_PED, p.Handle, first.Handle, 0, 16);
        threatUntil = Game.GameTime + 45000; // o ReactBody continua revidando
        Busy(45000);
    }

    // Libera 4 ou 5 estrelas: o CJ pega a AK e troca tiro com a polícia por um tempo, ou foge direto.
    // Fugindo de carro, se tiver uma oficina de pintura perto, ele pinta o carro e despista.
    int policeUntil;
    int policeFightUntil;
    const int PoliceSeconds = 120;

    void PoliceChase()
    {
        Ped p = Player;
        int now = Game.GameTime;
        policeUntil = now + PoliceSeconds * 1000;
        Function.Call((Hash)SET_MAX_WANTED_LEVEL, 5);
        Game.Player.WantedLevel = rng.Next(4, 6);
        wantedSince = now;
        Protect(PoliceSeconds * 1000);
        Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, WEAPON_AK, 600, false, true);
        bool fight = rng.Next(2) == 0;
        policeFightUntil = fight ? now + 35000 : 0;
        if (fight) EjectFromVehicle(p);
        GTA.UI.Notification.Show(fight ? "CJ LIVE: ~r~tiroteio com a polícia!" : "CJ LIVE: ~b~fuga da polícia!");
    }

    Vector3 paintTarget;
    bool goingToPaint;

    // Fugindo de carro: oficina de pintura mais perto (ou nenhuma, se todas estão longe)
    bool NearestPaintShop(Vector3 pos, out Vector3 shop)
    {
        shop = Vector3.Zero;
        float best = PaintShopMaxDistance;
        foreach (Vector3 s in PaintShops)
        {
            float d = Vector3.Distance2D(pos, s);
            if (d < best) { best = d; shop = s; }
        }
        return best < PaintShopMaxDistance;
    }

    // Chegou na oficina: carro com cor nova e a polícia perde ele de vista
    void Repaint(Vehicle v)
    {
        Function.Call((Hash)SET_VEHICLE_COLOURS, v.Handle, rng.Next(160), rng.Next(160));
        Function.Call((Hash)SET_VEHICLE_FIXED, v.Handle);
        Game.Player.WantedLevel = 0;
        policeUntil = 0;
        policeFightUntil = 0;
        goingToPaint = false;
        escaping = false;
        driveTaskIssued = false;
        GTA.UI.Notification.Show("CJ LIVE: ~g~pintou o carro e despistou a polícia!");
    }

    void Pumas()
    {
        Ped p = Player;
        Model model = new Model("a_c_mtlion");
        if (!model.Request(3000)) return;
        for (int i = 0; i < 6; i++)
        {
            Ped puma = World.CreatePed(model, p.Position + RandomRing(8f, 16f));
            if (puma == null) continue;
            Function.Call((Hash)TASK_COMBAT_PED, puma.Handle, p.Handle, 0, 16);
            puma.MarkAsNoLongerNeeded();
        }
        model.MarkAsNoLongerNeeded();
        Protect(20000);
        threatUntil = Game.GameTime + 20000;
    }

    // ---------- Presentes malucos ----------

    // Neve em Los Santos por 2 minutos (o chão fica branco), depois o céu abre
    void Snow()
    {
        Function.Call((Hash)SET_WEATHER_TYPE_OVERTIME_PERSIST, "XMAS", 5f);
        snowUntil = Game.GameTime + 120000;
    }

    // CJ tonto: anda cambaleando, a imagem balança e fica embaçada
    void Drunk()
    {
        Ped p = Player;
        const string walk = "move_m@drunk@verydrunk";
        Function.Call((Hash)REQUEST_ANIM_SET, walk);
        int timeout = Game.GameTime + 2000;
        while (!Function.Call<bool>((Hash)HAS_ANIM_SET_LOADED, walk) && Game.GameTime < timeout) Wait(0);
        Function.Call((Hash)SET_PED_MOVEMENT_CLIPSET, p.Handle, walk, 1f);
        Function.Call((Hash)SET_PED_IS_DRUNK, p.Handle, true);
        Function.Call((Hash)SET_TIMECYCLE_MODIFIER, "Drunk");
        Function.Call((Hash)SHAKE_GAMEPLAY_CAM, "DRUNK_SHAKE", 1.5f);
        drunkUntil = Game.GameTime + 40000;
    }

    // Modo Matrix: o mundo fica lento por uns segundos, com fogos em volta
    void SlowMotion()
    {
        slowUntilReal = Environment.TickCount + 12000;
        Function.Call((Hash)SET_TIME_SCALE, 0.3f);
        Fireworks();
    }

    // Gravidade da Lua: tudo fica leve e o CJ dá pulos gigantes por 30 s
    void MoonGravity()
    {
        Function.Call((Hash)SET_GRAVITY_LEVEL, 2);
        gravityUntil = Game.GameTime + 30000;
        nextMoonJumpAt = Game.GameTime + 1000;
        Protect(35000);
    }

    // Invasão de palhaços: eles chegam correndo para sair na mão com o CJ (sem armas)
    void Clowns()
    {
        Ped p = Player;
        EjectFromVehicle(p);
        Model model = new Model("s_m_y_clown_01");
        if (!model.Request(3000)) return;
        for (int i = 0; i < 10; i++)
        {
            Ped clown = World.CreatePed(model, p.Position + RandomRing(10f, 18f));
            if (clown == null) continue;
            Function.Call((Hash)TASK_COMBAT_PED, clown.Handle, p.Handle, 0, 16);
            clown.MarkAsNoLongerNeeded();
        }
        model.MarkAsNoLongerNeeded();
        Protect(30000);
        threatUntil = Game.GameTime + 25000; // o ReactBody revida
        Busy(20000);
    }

    // Chuva de vacas: caem do céu em volta dele
    void CowRain()
    {
        Ped p = Player;
        Model model = new Model("a_c_cow");
        if (!model.Request(3000)) return;
        Protect(15000);
        for (int i = 0; i < 10; i++)
        {
            Ped cow = World.CreatePed(model, p.Position + RandomRing(5f, 14f) + new Vector3(0f, 0f, 14f + rng.Next(8)));
            if (cow != null) cow.MarkAsNoLongerNeeded();
            Wait(200);
        }
        model.MarkAsNoLongerNeeded();
    }

    // Chuva de carros: caem do céu em volta (nunca em cima dele)
    void CarRain()
    {
        Ped p = Player;
        string[] models = { "panto", "blista", "issi2", "rhapsody", "dilettante", "faggio2", "bodhi2" };
        Protect(15000);
        for (int i = 0; i < 12; i++)
        {
            Model model = new Model(models[rng.Next(models.Length)]);
            if (!model.Request(2000)) continue;
            Vehicle car = World.CreateVehicle(model, p.Position + RandomRing(7f, 18f) + new Vector3(0f, 0f, 30f + rng.Next(15)), (float)rng.Next(360));
            model.MarkAsNoLongerNeeded();
            if (car == null) continue;
            car.Velocity = new Vector3(0f, 0f, -8f);
            car.MarkAsNoLongerNeeded();
            Wait(250);
        }
    }

    // Tornado: os carros e as pessoas em volta saem voando pro céu
    void Tornado()
    {
        Ped p = Player;
        Protect(15000);
        Function.Call((Hash)SET_WEATHER_TYPE_OVERTIME_PERSIST, "THUNDER", 3f);
        int count = 0;
        foreach (Vehicle v in World.GetNearbyVehicles(p.Position, 70f))
        {
            if (v == p.CurrentVehicle) continue;
            v.Velocity = new Vector3(RandomFloat(10f), RandomFloat(10f), 28f + rng.Next(18));
            if (++count >= 15) break;
        }
        foreach (Ped other in World.GetNearbyPeds(p, 40f))
        {
            if (count++ >= 25) break;
            Function.Call((Hash)SET_PED_TO_RAGDOLL, other.Handle, 4000, 6000, 0, false, false, false);
            other.Velocity = new Vector3(RandomFloat(6f), RandomFloat(6f), 18f);
        }
    }

    // ---------- Atitudes de jogador ----------

    // Zerinho: gira o carro no próprio eixo acelerando (ação 7 = vira à esquerda acelerando)
    bool Donut(bool announce)
    {
        Ped p = Player;
        if (!p.IsInVehicle() || p.CurrentVehicle.Driver != p) return false;
        Vehicle v = p.CurrentVehicle;
        Function.Call((Hash)TASK_VEHICLE_TEMP_ACTION, p.Handle, v.Handle, rng.Next(2) == 0 ? 7 : 8, 4500);
        AfterCarStunt(5000);
        if (announce) GameEvent("manobra", "O CJ deu um zerinho com o carro no meio da rua", Game.GameTime);
        return true;
    }

    // Canta pneu parado (ação 30 = burnout) e depois arranca
    bool Burnout()
    {
        Ped p = Player;
        Vehicle v = p.CurrentVehicle;
        Function.Call((Hash)TASK_VEHICLE_TEMP_ACTION, p.Handle, v.Handle, 30, 3000);
        AfterCarStunt(3500);
        GameEvent("manobra", "O CJ cantou pneu e saiu queimando borracha", Game.GameTime);
        return true;
    }

    // Rampa: aparece uma rampa na frente e ele acelera reto em cima dela
    Prop ramp;
    int rampRemoveAt;
    bool Ramp()
    {
        Ped p = Player;
        if (!p.IsInVehicle() || p.CurrentVehicle.Driver != p) return false;
        Vehicle v = p.CurrentVehicle;
        Model model = new Model("lts_prop_lts_ramp_02");
        if (!model.IsInCdImage) model = new Model("prop_mp_ramp_02");
        if (!model.Request(3000)) return false;
        if (ramp != null && ramp.Exists()) ramp.Delete();
        Vector3 ahead = v.Position + v.ForwardVector * 28f;
        ramp = World.CreateProp(model, ahead, new Vector3(0f, 0f, v.Heading), false, true);
        model.MarkAsNoLongerNeeded();
        if (ramp == null) return false;
        Function.Call((Hash)SET_VEHICLE_FORWARD_SPEED, v.Handle, Math.Max(v.Speed, 26f));
        Function.Call((Hash)TASK_VEHICLE_TEMP_ACTION, p.Handle, v.Handle, 23, 3500); // 23 = acelera reto
        rampRemoveAt = Game.GameTime + 12000;
        Protect(10000);
        AfterCarStunt(5000);
        GameEvent("manobra", "O CJ pulou uma rampa com o carro e voou longe", Game.GameTime);
        return true;
    }

    // Depois da manobra, o DriveStep retoma a rota normal
    void AfterCarStunt(int ms)
    {
        Busy(ms);
        driveTaskIssued = false;
        stillSince = 0;
    }

    // Pedestre por perto que dá para "arrumar briga": gente comum a pé (nem polícia, nem os manos da Grove)
    Ped RandomPedestrian(Ped p, float radius)
    {
        var options = new List<Ped>();
        foreach (Ped other in World.GetNearbyPeds(p, radius))
        {
            if (other.IsDead || other.IsInVehicle() || crew.Contains(other)) continue;
            if (!Function.Call<bool>((Hash)IS_PED_HUMAN, other.Handle)) continue;
            int type = Function.Call<int>((Hash)GET_PED_TYPE, other.Handle);
            if (type == 6 || type == 27 || type == 29) continue; // polícia, SWAT, exército
            options.Add(other);
        }
        return options.Count == 0 ? null : options[rng.Next(options.Count)];
    }

    // Briga de rua: sai na mão com um pedestre (às vezes saca a pistola)
    bool StreetFight(bool announce)
    {
        Ped p = Player;
        Ped target = RandomPedestrian(p, 25f);
        if (target == null) return false;
        bool gun = rng.NextDouble() < 0.3;
        if (gun) Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, WEAPON_PISTOL, 100, false, true);
        Function.Call((Hash)SET_CURRENT_PED_WEAPON, p.Handle, gun ? WEAPON_PISTOL : WEAPON_UNARMED, true);
        Function.Call((Hash)TASK_COMBAT_PED, p.Handle, target.Handle, 0, 16);
        Function.Call((Hash)TASK_COMBAT_PED, target.Handle, p.Handle, 0, 16);
        Busy(15000);
        if (announce) GameEvent("briga", "O CJ arrumou briga com um pedestre que encarou ele na rua", Game.GameTime);
        return true;
    }

    // Destrói um carro parado: descarrega a AK nele até explodir
    Vehicle vandalTarget;
    int vandalExplodeAt;
    bool Vandalism(bool announce)
    {
        Ped p = Player;
        Vehicle target = null;
        foreach (Vehicle v in World.GetNearbyVehicles(p.Position, 30f))
        {
            if (v.Driver != null && v.Driver.Exists() || v.Position.DistanceTo(p.Position) < 6f) continue; // vazio e não colado nele
            if (target == null || v.Position.DistanceTo(p.Position) < target.Position.DistanceTo(p.Position)) target = v;
        }
        if (target == null) return false;
        Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, WEAPON_AK, 300, false, true);
        Function.Call((Hash)SET_CURRENT_PED_WEAPON, p.Handle, WEAPON_AK, true);
        Function.Call((Hash)TASK_SHOOT_AT_ENTITY, p.Handle, target.Handle, 4500, FIRING_PATTERN_FULL_AUTO);
        vandalTarget = target;
        vandalExplodeAt = Game.GameTime + 4500;
        Protect(8000);
        Busy(7000);
        if (announce) GameEvent("vandalismo", "O CJ descarregou a AK num carro parado ate ele explodir", Game.GameTime);
        return true;
    }

    // Comemora dando tiro pro alto
    bool ShootInAir(bool announce)
    {
        Ped p = Player;
        Function.Call((Hash)GIVE_WEAPON_TO_PED, p.Handle, WEAPON_PISTOL, 100, false, true);
        Function.Call((Hash)SET_CURRENT_PED_WEAPON, p.Handle, WEAPON_PISTOL, true);
        Vector3 up = p.Position + p.ForwardVector * 3f + new Vector3(0f, 0f, 25f);
        Function.Call((Hash)TASK_SHOOT_AT_COORD, p.Handle, up.X, up.Y, up.Z, 3000, FIRING_PATTERN_FULL_AUTO);
        Busy(3500);
        if (announce) GameEvent("tiro_pro_alto", "O CJ deu uns tiros pro alto comemorando", Game.GameTime);
        return true;
    }

    // Sai correndo um pedaço, como quem está com pressa
    bool Sprint()
    {
        Ped p = Player;
        Vector3 target = p.Position + p.ForwardVector * 45f + RandomOffset(10f);
        Function.Call((Hash)TASK_FOLLOW_NAV_MESH_TO_COORD, p.Handle, target.X, target.Y, target.Z, 3.0f, 10000, 2f, 0, 40000f);
        Busy(9000);
        return true;
    }

    // Uma palhaçada sorteada (galinha, guitarra imaginária, chorão, disco do tio...)
    void FunnyEmote()
    {
        string name = FunnyEmotes[rng.Next(FunnyEmotes.Length)];
        PlayAnim("anim@mp_player_intcelebrationmale@" + name, name, 5000, 0);
    }

    // Anda igual ao Trevor por 1 minuto
    int trevorWalkUntil;
    void TrevorWalk()
    {
        const string walk = "move_p_m_two"; // o jeito de andar do Trevor
        Function.Call((Hash)REQUEST_ANIM_SET, walk);
        int timeout = Game.GameTime + 2000;
        while (!Function.Call<bool>((Hash)HAS_ANIM_SET_LOADED, walk) && Game.GameTime < timeout) Wait(0);
        Function.Call((Hash)SET_PED_MOVEMENT_CLIPSET, Player.Handle, walk, 1f);
        trevorWalkUntil = Game.GameTime + 60000;
    }

    // Fúria do Trevor: a tela fica vermelha, o tempo desacelera e o CJ surta
    int rageUntil;
    void TrevorRage()
    {
        Function.Call((Hash)SET_TIMECYCLE_MODIFIER, "REDMIST");
        slowUntilReal = Environment.TickCount + 8000;
        rageUntil = Game.GameTime + 12000;
        Protect(15000);
        EjectFromVehicle(Player);
        PlayAnim("anim@mp_player_intcelebrationmale@freakout", "freakout", 4000, 0);
    }

    // Um avião ou helicóptero sem controle cai perto do CJ (nunca em cima) e explode
    Vehicle crashing;
    int crashExplodeAt;

    void PlaneCrash()
    {
        Ped p = Player;
        string[] models = { "cuban800", "duster", "mammatus", "maverick", "frogger", "buzzard2" };
        Model model = new Model(models[rng.Next(models.Length)]);
        if (!model.Request(4000)) return;
        Vector3 impact = p.Position + RandomRing(25f, 40f);
        Vector3 start = impact + RandomRing(70f, 90f) + new Vector3(0f, 0f, 60f);
        Vector3 dir = impact - start;
        dir.Normalize();
        float heading = (float)(Math.Atan2(dir.Y, dir.X) * 180 / Math.PI) - 90f;
        Vehicle plane = World.CreateVehicle(model, start, heading);
        model.MarkAsNoLongerNeeded();
        if (plane == null) return;
        Function.Call((Hash)SET_VEHICLE_ENGINE_ON, plane.Handle, true, true, false);
        Function.Call((Hash)SET_VEHICLE_ENGINE_HEALTH, plane.Handle, -1f); // motor pegando fogo
        Function.Call((Hash)SET_VEHICLE_OUT_OF_CONTROL, plane.Handle, false, true);
        plane.Velocity = dir * 35f;
        Protect(15000);
        crashing = plane;
        crashExplodeAt = Game.GameTime + 7000; // se não explodir sozinho na batida, explode depois
    }

    // Liga/desliga os efeitos com duração (chamado todo frame)
    void EffectsStep(int now)
    {
        if (slowUntilReal != 0)
        {
            if (Environment.TickCount > slowUntilReal) { slowUntilReal = 0; Function.Call((Hash)SET_TIME_SCALE, 1f); }
            else Function.Call((Hash)SET_TIME_SCALE, rageUntil > now ? 0.6f : 0.3f);
        }
        if (rageUntil != 0 && now > rageUntil)
        {
            rageUntil = 0;
            if (drunkUntil == 0) Function.Call((Hash)CLEAR_TIMECYCLE_MODIFIER);
        }
        if (trevorWalkUntil != 0 && now > trevorWalkUntil)
        {
            trevorWalkUntil = 0;
            if (drunkUntil == 0) Function.Call((Hash)RESET_PED_MOVEMENT_CLIPSET, Player.Handle, 1f);
        }
        if (gravityUntil != 0)
        {
            Ped p = Player;
            if (now > gravityUntil) { gravityUntil = 0; Function.Call((Hash)SET_GRAVITY_LEVEL, 0); }
            else if (now >= nextMoonJumpAt && !p.IsInVehicle() && !p.IsInAir && !p.IsRagdoll)
            {
                nextMoonJumpAt = now + 2500;
                Vector3 fwd = p.ForwardVector;
                p.Velocity = new Vector3(fwd.X * 5f, fwd.Y * 5f, 9f);
            }
        }
        if (vandalTarget != null && now > vandalExplodeAt)
        {
            if (vandalTarget.Exists()) Explosion(vandalTarget.Position, EXPLOSION_GRENADE);
            vandalTarget = null;
        }
        if (ramp != null && now > rampRemoveAt)
        {
            if (ramp.Exists()) ramp.Delete();
            ramp = null;
        }
        if (crashing != null && now > crashExplodeAt)
        {
            if (crashing.Exists())
            {
                Explosion(crashing.Position, EXPLOSION_GRENADE);
                crashing.MarkAsNoLongerNeeded();
            }
            crashing = null;
        }
        if (now < nextEffectCheck) return;
        nextEffectCheck = now + 1000;
        ShortNights(now);
        if (drunkUntil != 0)
        {
            if (now > drunkUntil) StopDrunk();
            else if (cam != null && !Function.Call<bool>((Hash)IS_CAM_SHAKING, cam.Handle))
                Function.Call((Hash)SHAKE_CAM, cam.Handle, "DRUNK_SHAKE", 1.5f); // a câmera da live também balança
        }
        if (snowUntil != 0 && now > snowUntil)
        {
            snowUntil = 0;
            Function.Call((Hash)SET_WEATHER_TYPE_OVERTIME_PERSIST, "CLEAR", 20f);
        }
    }

    // Das 21h às 5h o relógio corre mais rápido, a não ser que um presente tenha pedido a noite
    void ShortNights(int now)
    {
        if (now < nightForcedUntil) return;
        int hour = Function.Call<int>((Hash)GET_CLOCK_HOURS);
        if (hour >= NightStartHour || hour < NightEndHour)
            Function.Call((Hash)ADD_TO_CLOCK_TIME, 0, NightExtraMinutesPerSecond, 0);
    }

    void StopDrunk()
    {
        drunkUntil = 0;
        Function.Call((Hash)RESET_PED_MOVEMENT_CLIPSET, Player.Handle, 1f);
        Function.Call((Hash)SET_PED_IS_DRUNK, Player.Handle, false);
        Function.Call((Hash)CLEAR_TIMECYCLE_MODIFIER);
        Function.Call((Hash)STOP_GAMEPLAY_CAM_SHAKING, true);
        if (cam != null) Function.Call((Hash)STOP_CAM_SHAKING, cam.Handle, true);
    }

    // Recarregou o mod (Insert) no meio de um efeito: volta tudo ao normal
    void ResetEffects()
    {
        Function.Call((Hash)SET_TIME_SCALE, 1f);
        Function.Call((Hash)SET_GRAVITY_LEVEL, 0);
        if (drunkUntil != 0 || rageUntil != 0 || trevorWalkUntil != 0) StopDrunk();
    }

    // De moto/bicicleta/quadriciclo, às vezes ele empina: levanta a frente até o ângulo alvo e segura uns segundos
    void WheelieStep(int now)
    {
        Ped p = Player;
        if (!autopilot || !p.IsInVehicle()) { wheelieUntil = 0; return; }
        Vehicle v = p.CurrentVehicle;
        if (v.Driver != p) return;
        int model = v.Model.Hash;
        if (!Function.Call<bool>((Hash)IS_THIS_MODEL_A_BIKE, model) && !Function.Call<bool>((Hash)IS_THIS_MODEL_A_BICYCLE, model)
            && !Function.Call<bool>((Hash)IS_THIS_MODEL_A_QUADBIKE, model)) return;

        if (wheelieUntil == 0)
        {
            if (now < nextWheelieAt) return;
            bool boost = now < wheelieBoostUntil;
            nextWheelieAt = now + (boost ? rng.Next(5, 10) : rng.Next(WheelieMinSeconds, WheelieMaxSeconds + 1)) * 1000;
            if (v.Speed < 6f || v.IsInAir || (!boost && rng.NextDouble() > WheelieChance)) return;
            wheelieUntil = now + rng.Next(1500, 4000);
            return;
        }
        if (now > wheelieUntil || v.IsInAir) { wheelieUntil = 0; return; }
        float pitch = Function.Call<float>((Hash)GET_ENTITY_PITCH, v.Handle);
        // força para cima na frente do veículo (relativa a ele); acima do ângulo alvo a gravidade segura
        if (pitch < WheeliePitch)
            Function.Call((Hash)APPLY_FORCE_TO_ENTITY, v.Handle, 1, 0f, 0f, WheelieForce, 0f, 1.0f, 0f, 0, true, true, true, false, true);
    }

    Vector3 RandomRing(float min, float max)
    {
        double angle = rng.NextDouble() * Math.PI * 2;
        float dist = min + (float)rng.NextDouble() * (max - min);
        return new Vector3((float)Math.Cos(angle) * dist, (float)Math.Sin(angle) * dist, 0f);
    }

    float RandomFloat(float range)
    {
        return (float)(rng.NextDouble() * 2 - 1) * range;
    }

    void Explosion(Vector3 pos, int type)
    {
        Function.Call((Hash)ADD_EXPLOSION, pos.X, pos.Y, pos.Z, type, 1f, true, false, 1f, false);
    }

    Vector3 RandomOffset(float radius)
    {
        return new Vector3((float)(rng.NextDouble() * 2 - 1) * radius, (float)(rng.NextDouble() * 2 - 1) * radius, 0f);
    }
}
