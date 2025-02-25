import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runCommand(command, description) {
  console.log(`\n=== ${description} ===\n`);
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    process.exit(1);
  }
}

async function runAll() {
  console.log("=== ZenPosture Model Training Pipeline ===\n");
  
  // Step 1: Visualize data
  await runCommand('node visualize_data.js', 'Visualizing Data');
  
  // Step 2: Train model
  await runCommand('node train_node_tfjs.js', 'Training Model');
  
  // Step 3: Test model
  await runCommand('node test_model.js', 'Testing Model');
  
  console.log("\n=== Pipeline Complete ===");
  console.log("The model has been trained, tested, and saved to:");
  console.log("- Local directory: model.json, model_weights.json");
  console.log("- Test app: ../ml-test/public/model/");
}

runAll().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
}); 