// Kiểm tra các bí mật trong api/.env có bị lộ vào Git không, kể cả lịch sử commit.
// Cách dùng: node scripts\checkSecrets.js
// Script KHÔNG in giá trị bí mật ra màn hình, chỉ in tên biến và tên file.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
const MIN_LENGTH = 6; // giá trị quá ngắn dễ trùng ngẫu nhiên nên bỏ qua

function run(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024
  });
  if (result.error) {
    console.error('Khong chay duoc git:', result.error.message);
    process.exit(1);
  }
  return result;
}

const root = run(['rev-parse', '--show-toplevel'], __dirname).stdout.trim();
if (!root) {
  console.error('Khong tim thay repository Git.');
  process.exit(1);
}
const git = (args) => run(args, root);

let failed = false;

// ----- 1. File .env có đang được Git theo dõi hoặc từng được commit không? -----
const isEnvFile = (file) => {
  const base = file.split('/').pop();
  return base === '.env' || (base.startsWith('.env.') && base !== '.env.example');
};

const tracked = git(['ls-files']).stdout.split('\n').filter(Boolean).filter(isEnvFile);
if (tracked.length > 0) {
  failed = true;
  console.error('LOI: file .env dang duoc Git theo doi:', tracked.join(', '));
} else {
  console.log('OK   khong co file .env nao dang duoc Git theo doi');
}

const everCommitted = [
  ...new Set(
    git(['log', '--all', '--name-only', '--pretty=format:'])
      .stdout.split('\n')
      .filter(Boolean)
      .filter(isEnvFile)
  )
];
if (everCommitted.length > 0) {
  failed = true;
  console.error('LOI: file .env tung duoc commit trong lich su:', everCommitted.join(', '));
} else {
  console.log('OK   khong co file .env nao tung duoc commit trong lich su');
}

// ----- 2. Giá trị bí mật có xuất hiện trong nội dung file nào không? -----
if (!fs.existsSync(envPath)) {
  console.error('Khong thay api/.env nen khong the kiem tra noi dung bi mat.');
  process.exit(failed ? 1 : 0);
}

const env = dotenv.parse(fs.readFileSync(envPath));
const secrets = [];

['JWT_SECRET', 'SMTP_PASS', 'SMTP_USER'].forEach((name) => {
  if (env[name]) {
    secrets.push({ name, value: env[name] });
  }
});

if (env.MONGODB_URI) {
  secrets.push({ name: 'MONGODB_URI', value: env.MONGODB_URI });
  const match = env.MONGODB_URI.match(/^mongodb(?:\+srv)?:\/\/([^:@/]+):([^@]+)@/);
  if (match) {
    secrets.push({ name: 'MONGODB_PASSWORD', value: match[2] });
    try {
      const decoded = decodeURIComponent(match[2]);
      if (decoded !== match[2]) {
        secrets.push({ name: 'MONGODB_PASSWORD (da giai ma)', value: decoded });
      }
    } catch (error) {
      // Bỏ qua nếu không giải mã được
    }
  }
}

const revisions = git(['rev-list', '--all']).stdout.split('\n').filter(Boolean);

// Trả về danh sách nơi tìm thấy giá trị (chỉ tên file, không có nội dung)
function findValue(value) {
  const hits = [];

  // Các file đang được theo dõi ở thư mục làm việc
  let result = git(['grep', '-I', '-l', '-F', '-e', value]);
  if (result.status === 0) {
    result.stdout
      .split('\n')
      .filter(Boolean)
      .forEach((file) => hits.push(`(thu muc lam viec) ${file}`));
  } else if (result.status !== 1) {
    throw new Error(`git grep loi (ma ${result.status})`);
  }

  // Mọi commit trong lịch sử, chia nhóm để lệnh không quá dài
  for (let i = 0; i < revisions.length; i += 30) {
    const chunk = revisions.slice(i, i + 30);
    result = git(['grep', '-I', '-l', '-F', '-e', value, ...chunk]);
    if (result.status === 0) {
      result.stdout
        .split('\n')
        .filter(Boolean)
        .forEach((line) => hits.push(`${line.slice(0, 7)}${line.slice(40)}`));
    } else if (result.status !== 1) {
      throw new Error(`git grep loi (ma ${result.status})`);
    }
  }

  return hits;
}

console.log(`Dang quet ${revisions.length} commit trong lich su...`);

secrets.forEach(({ name, value }) => {
  if (value.length < MIN_LENGTH) {
    console.log(`BO QUA ${name}: gia tri qua ngan de quet chinh xac`);
    return;
  }

  const hits = findValue(value);
  if (hits.length === 0) {
    console.log(`OK   ${name}: khong xuat hien trong lich su Git`);
  } else {
    failed = true;
    console.error(`LOI  ${name}: XUAT HIEN trong Git (${hits.length} cho). Vi du:`);
    hits.slice(0, 5).forEach((hit) => console.error(`       ${hit}`));
  }
});

if (failed) {
  console.error('\nCO BI MAT BI LO. Hay doi ngay mat khau/khoa lien quan (xem huong dan).');
  process.exit(1);
}

console.log('\nOK: khong phat hien bi mat nao trong Git');