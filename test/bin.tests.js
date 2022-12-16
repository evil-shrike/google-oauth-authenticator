import bin from 'bin-tester';
import assert from 'assert';

suite('bin scripts', () => {
  test('running without arguments shows help', async () => {
    const testArgs = [];
    // Execute test with the specified arguments in the current folder
    const results = await bin(testArgs, './', './', {}, 'goauth');
    console.log(results);
    assert.ok( results.stderr.includes('Generate a refresh token') );
    assert.ok( results.stderr.includes('Not enough non-option arguments') );
  });

  test('get-token: scope arg is require', async () => {
    const testArgs = ['get-token'];
    // Execute test with the specified arguments in the current folder
    const results = await bin(testArgs, './', './', {}, 'goauth');
    console.log(results);
    assert.ok( results.stderr.includes('Please specify at least one scope') );
  });

  test('get-token: asks for client id or secrets file', async () => {
    const testArgs = ['get-token', '--scope', 'https://www.googleapis.com/auth/adwords'];
    // Execute test with the specified arguments in the current folder
    const results = await bin(testArgs, './', './', {}, 'goauth');
    console.log(results);
    assert.ok( results.stderr.includes('Please specify client id') );
  });

  test('get-token: non existing secrets file', async () => {
    const testArgs = ['get-token', '--scope', 'https://www.googleapis.com/auth/adwords', '--secrets-file', 'somefile'];
    // Execute test with the specified arguments in the current folder
    const results = await bin(testArgs, './', './', {}, 'goauth');
    console.log(results);
    assert.ok( results.stderr.includes('The provided secrets file does not exist') );
  });

});