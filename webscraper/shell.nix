{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.chromium
  ];

  shellHook = ''
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"
    echo "Chromium path: $PUPPETEER_EXECUTABLE_PATH"
  '';
}
