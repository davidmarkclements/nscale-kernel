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

var collections = ['history'];
var mongojs = require('mongojs');



/**
 * maintains system commit log and history
 *
 * TODO: merge this with system db
 *
 * history maintains a history of all versions of the system in the following format
 *
 * {
 *   revision: 
 *   Description: 
 *   Deployed: 
 *   prev:
 *   systemId: 
 *   sys: {...}
 * }
 */
module.exports = function(options) {
  var _db;



  /**
   * commit a new version of the system, the head of the commit log 
   * may be ahead of the actual deployed version of the system
   */
  var commitRevision = function(systemId, description, sysJson, cb) {
    var rev;
    getHead(systemId, function(err, head) {
      if (err) { return cb(err); }
      if (head) {
        rev = {revision: head.revision + 1,
               description: description,
               deployed: false,
               previous: head._id,
               systemId: sysJson.id,
               system: sysJson};
      }
      else {
        rev = {revision: 1,
               description: description,
               deployed: false,
               previous: null,
               systemId: sysJson.id,
               system: sysJson};
      }
      _db.history.save(rev, function(err) {
        cb(err);
      });
    });
  };



  /**
   * get the head revision for a system
   */
  var getHead = function(systemId, cb) {
    _db.history.find({systemId: systemId}).sort({revision: -1}, function(err, data) {
      if (err) { return cb(err); }
      cb(null, data[0]);
    });
  };



  /**
   * get a revision from the history, if no version number is specified get the head
   */
  var getRevision = function(systemId, revisionId, cb) {
    if (!revisionId) {
      getHead(systemId, cb);
    }
    else {
      _db.history.find({systemId: systemId, revision: revisionId}, function(err, revision) {
        if (err) { return cb(err); }
        cb(null, revision[0]);
      });
    }
  };



  /**
   * set the currently deployed revision, there will only ever be one deployed revision
   * clear the currently deployed flag and set the deployed flag against the specified revision
   */
  var deployRevision = function(systemId, revisionId, cb) {
    _db.update({systemId: systemId}, {$set:{deployed: false}}, function(e1) {
      if (e1) { return cb(e1); }
      _db.update({systemId: systemId, revision: revisionId}, {$set:{deployed: true}}, function(e2) {
        cb(e2);
      });
    });
  };



  /**
   * list all of the available revisions in the system
   */
  var listRevisions = function(systemId, cb) {
    _db.history.find({systemId: systemId},{}).sort({revision: -1}, function(err, data) {
      if (err) { return cb(err); }
      cb(null, data);
    });
  };



  var construct = function() {
    _db = mongojs(options.dbConnection, collections);
  };



  construct();
  return {
    commitRevision: commitRevision,
    deployRevision: deployRevision,
//    getDeployedRevision: getDeployedRevision,
    listRevisions: listRevisions,
    getHead: getHead,
    getRevision: getRevision
  };
};

