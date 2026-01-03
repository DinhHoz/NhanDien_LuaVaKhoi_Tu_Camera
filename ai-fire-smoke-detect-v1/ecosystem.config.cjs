module.exports = {
  apps: [
    {
      name: "backend",
      script: "index.js",
      cwd: "./backend",
    },
    {
      name: "worker",
      script: "worker/worker.js",
      cwd: "./backend",
    },
    {
      name: "detector",
      script: "detect.py",
      interpreter: "python",
      cwd: "./detector",
    },
  ],
};
