/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var _ = require('underscore');
var fse = require('fs-extra');
var git = require('./gitutil');
var blank = {};
var SYSREPO = '_sys';

//TODO: replace these
//var GIT_NAME = 'Peter Elger';
//var GIT_MAIL = 'peter.elger@nearform.com';




/**
 * maintains system repository conaining system meta information
 * maintains system commit log and history using nodegit
 * uses master branch only
 * need to be able to create a new repo on demand - for new system definition
 */
module.exports = function(options) {

  var _systems;


  /**
   * ensures that the system repository is in place, creates it if doesn't exist
   */
  var boot = function(cb) {
    if (fse.existsSync(options.systemsRoot + '/' + SYSREPO + '/systems.json')) {
      fse.readFile(options.systemsRoot + '/' + SYSREPO + '/systems.json', 'utf8', function(err, data) {
        _systems = JSON.parse(data);
        cb(err);
      });
    }
    else {
      fse.mkdirpSync(options.systemsRoot + '/' + SYSREPO);
      fse.writeFileSync(options.systemsRoot + '/' + SYSREPO + '/systems.json', JSON.stringify(blank, null, 2), 'utf8');
      git.createRepository(options.systemsRoot + '/' + SYSREPO, ['systems.json'], 'system', 'system@nfd.com', function(err) {
        _systems = blank;
        cb(err);
      });
    }
  };



  /**
   * register a system
   */
  var register = function(user, repoName, repoPath, systemId, cb) {
    if (!_systems[systemId]) {
      _systems[systemId] = { repoName: repoName, repoPath: repoPath };
      fse.writeFileSync(options.systemsRoot + '/' + SYSREPO + '/systems.json', JSON.stringify(_systems, null, 2), 'utf8');
      git.commit(options.systemsRoot + '/' + SYSREPO, ['systems.json'], 'registered system: ' + repoPath, user.name, user.email, cb);
    }
    else {
      cb(null);
    }
  };



  /**
   * returns a repository path from a system id
   */
  var repoPath = function(systemId) {
    return _systems[systemId].repoPath;
  };



  var repoId = function(repoName) {
    var systemId = _.find(_.keys(_systems), function(systemId) { return _systems[systemId].repoName === repoName; });
    return systemId;
  };



  var listSystems = function() {
    var result = [];
    _.each(_.keys(_systems), function(system) {
      result.push({name: _systems[system].repoName, id: system});
    });
    return result;
  };



  /**
   * convert identifier into full system guid using:
   * 1) exact match on key
   * 2) partial match on key
   * 3) partial match on name
   */
  var findSystem = function(identifier) {
    var re = new RegExp('^' + identifier + '.*', ['i']);
    var systemId;

    systemId = _.find(_.keys(_systems), function(system) { return system === identifier; });

    if (!systemId) {
      systemId = _.find(_.keys(_systems), function(system) { return re.test(system); });
    }

    if (!systemId) {
      systemId = _.find(_.keys(_systems), function(system) { return re.test(_systems[system].repoName); });
    }

    return systemId;
  };



  return {
    boot: boot,
    register: register,
    repoPath: repoPath,
    repoId: repoId,
    listSystems: listSystems,
    findSystem: findSystem,
  };
};

