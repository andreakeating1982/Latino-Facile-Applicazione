#!/usr/bin/env python3
"""Verifica ZIP contro HEAD pulito. Solo libreria standard; nessuna rete/DB."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import zipfile


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.DEVNULL)


def sha256(body):
    return hashlib.sha256(body).hexdigest()


def forbidden(relative):
    parts = PurePosixPath(relative).parts
    name = parts[-1]
    excluded = {'.git', 'node_modules', 'dist', 'build', '.cache', '.pnpm-store', 'coverage', '__pycache__', 'reports'}
    return bool(set(parts) & excluded) or (name.startswith('.env') and name != '.env.example') or bool(re.search(r'\.(?:log|db|sqlite3?|pem|key|zip|pyc)$', name, re.I))


def validate(repo, archive):
    if Path(git(repo, 'rev-parse', '--show-toplevel').decode().strip()).resolve() != repo:
        raise ValueError('La cartella deve essere una repository Git autonoma.')
    if git(repo, 'status', '--porcelain', '--untracked-files=normal').strip():
        raise ValueError('Repository non pulita: rivedere e committare prima di esportare.')
    head = git(repo, 'rev-parse', 'HEAD').decode().strip()
    tracked = set(git(repo, 'ls-tree', '-rz', '--name-only', 'HEAD').decode().split('\0')) - {''}
    package = json.loads(git(repo, 'show', 'HEAD:package.json'))
    manifest = json.loads(git(repo, 'show', 'HEAD:manifest.json'))
    name = package['name']
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', name):
        raise ValueError('Nome pacchetto non sicuro.')
    prefix = name + '/'
    required = set(manifest['portablePackage']['requiredFiles'])
    known_secret = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{32,}\b|\bAIza[A-Za-z0-9_-]{35}\b')
    hashes = {}
    total_bytes = directories = 0
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError('Controllo CRC fallito.')
        if z.comment.decode().strip() != head:
            raise ValueError('Il commento ZIP non identifica HEAD.')
        for entry in z.infolist():
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename or not entry.filename.startswith(prefix):
                raise ValueError('Percorso ZIP non sicuro: ' + entry.filename)
            if stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError('Link simbolico non previsto nel pacchetto.')
            if entry.is_dir():
                directories += 1
                continue
            relative = entry.filename[len(prefix):]
            if not relative or relative in hashes or relative not in tracked or forbidden(relative):
                raise ValueError('File duplicato, privato o non tracciato: ' + relative)
            body = z.read(entry)
            total_bytes += len(body)
            if total_bytes > 512 * 1024 * 1024:
                raise ValueError('Dimensione totale inattesa, oltre 512 MiB.')
            digest = sha256(body)
            if digest != sha256(git(repo, 'show', 'HEAD:' + relative)):
                raise ValueError('Hash diverso dal commit: ' + relative)
            if known_secret.search(body):
                raise ValueError('Possibile credenziale nel file: ' + relative)
            hashes[relative] = digest
        if set(hashes) != tracked:
            raise ValueError('File dell’archivio non coincidenti con HEAD: ' + repr(sorted(tracked ^ set(hashes))))
        if required - set(hashes):
            raise ValueError('File necessari mancanti: ' + repr(sorted(required - set(hashes))))
        if manifest['scripts'] != package['scripts'] or manifest['name'] != name:
            raise ValueError('Manifest e package non allineati.')
        if manifest['node'] != package['engines']['node'] or manifest['packageManager'] != package['packageManager']:
            raise ValueError('Versioni ambiente non allineate.')
        for relative in package.get('pnpm', {}).get('patchedDependencies', {}).values():
            if relative not in hashes:
                raise ValueError('Patch pnpm mancante: ' + relative)
        guide = z.read(prefix + 'PHOTO-CROP-CLONABILE.md').decode()
        sources = dict(re.findall(r'^### FILE: ([^\n]+)\n\n````[^\n]*\n(.*?)^````\n', guide, re.M | re.S))
        block = guide.split('## HASH SHA-256 DEI FILE TESTUALI', 1)[1]
        embedded = json.loads(re.search(r'```json\n(.*?)\n```', block, re.S).group(1))
        if set(sources) != set(embedded['file_sha256']) or len(sources) != 18:
            raise ValueError('Foglio cropper incompleto.')
        source_matches = 0
        for relative, source in sources.items():
            body = source.encode()
            if sha256(body) != embedded['file_sha256'][relative]:
                raise ValueError('Hash incorporato cropper errato: ' + relative)
            if relative in hashes:
                if z.read(prefix + relative) != body:
                    raise ValueError('Foglio cropper diverso dai sorgenti: ' + relative)
                source_matches += 1
    baseline = manifest.get('release', {}).get('codeCommit')
    source_comparison = {'available': False, 'matches': None, 'reason': 'Commit storico non disponibile nella storia Git locale oppure variante non pubblicata.'}
    packaging_changed = []
    if baseline:
        try:
            git(repo, 'cat-file', '-e', baseline + '^{commit}')
            changes = git(repo, 'diff', '--name-only', baseline, 'HEAD', '--', 'client', 'server', 'shared').decode().splitlines()
            packaging_changed = git(repo, 'diff', '--name-only', baseline, 'HEAD', '--', 'package.json', 'pnpm-lock.yaml', 'Dockerfile', 'render.yaml', '.github', '.node-version', '.gitignore', '.dockerignore', 'scripts').decode().splitlines()
            source_comparison = {'available': True, 'matches': not changes, 'changed_files': changes, 'baseline_commit': baseline}
        except subprocess.CalledProcessError:
            pass
    return {
        'ok': True, 'archive': archive.name, 'archive_commit': head,
        'package_name': name, 'root_prefix': prefix, 'zip_crc_ok': True,
        'all_head_files_present_and_sha256_identical': True,
        'files': len(hashes), 'directory_entries': directories,
        'compressed_bytes': archive.stat().st_size, 'uncompressed_bytes': total_bytes,
        'required_files_verified': len(required),
        'font_files': sum(p.endswith(('.ttf', '.otf', '.woff', '.woff2')) for p in hashes),
        'historical_pdf_files': sum(p.startswith('client/public/quaderno-') and p.endswith('.pdf') for p in hashes),
        'cropper': {'embedded_sources_verified': len(sources), 'repository_sources_matched': source_matches, 'baseline_deployment': embedded['production_baseline_deployment']},
        'application_source_comparison': source_comparison,
        'packaging_files_changed_vs_historical_release': packaging_changed,
        'no_forbidden_private_runtime_files': True,
        'credential_scan': 'Nessuna firma nota rilevata; non audit di sicurezza completo.',
        'sha256': sha256(archive.read_bytes()), 'file_sha256': dict(sorted(hashes.items())),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    try:
        result = validate(args.repo.resolve(), args.archive.resolve())
        text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(text, encoding='utf-8')
        checksum = Path(str(args.archive.resolve()) + '.sha256')
        checksum.write_text(result['sha256'] + '  ' + args.archive.name + '\n', encoding='utf-8')
        summary = {k: v for k, v in result.items() if k != 'file_sha256'}
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError, IndexError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        parser.exit(1, 'VERIFICA FALLITA: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
